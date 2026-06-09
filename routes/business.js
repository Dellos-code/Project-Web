const express = require('express');
const router = express.Router();
const db = require('../database');

// Αποστολή αιτήματος (-1 credit στον καταναλωτή)
router.post('/request', (req, res) => {
    const { post_id, consumer_id } = req.body;
    db.get(`SELECT credits FROM users WHERE id = ?`, [consumer_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Σφάλμα χρήστη.' });
        if (user.credits < 1) return res.status(403).json({ error: 'Δεν έχεις αρκετούς πόντους.' });

        db.get(`SELECT portions_available FROM posts WHERE id = ?`, [post_id], (err, post) => {
            if (err || !post) return res.status(404).json({ error: 'Αγγελία δεν βρέθηκε.' });
            if (post.portions_available <= 0) return res.status(400).json({ error: 'Οι μερίδες έχουν εξαντληθεί.' });

            db.get(`SELECT id FROM requests WHERE post_id = ? AND consumer_id = ?`, [post_id, consumer_id], (err, existing) => {
                if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
                if (existing) return res.status(400).json({ error: 'Έχετε ήδη στείλει αίτημα.' });

                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    db.run(`INSERT INTO requests (post_id, consumer_id) VALUES (?, ?)`, [post_id, consumer_id], function(err) {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα αιτήματος.' }); }
                        const requestId = this.lastID;
                        db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [consumer_id]);
                        db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 'portion_request', 'request', ?)`, [consumer_id, requestId], function(err) {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα πόντων.' }); }
                            db.run('COMMIT');
                            res.status(201).json({ message: 'Το αίτημα στάλθηκε στον μάγειρα!' });
                        });
                    });
                });
            });
        });
    });
});

// Ανάκτηση αιτημάτων για τον Μάγειρα (includes post_id για το approve)
router.get('/cook-requests/:cook_id', (req, res) => {
    const query = `
        SELECT r.id as request_id, r.post_id, r.status, p.title, p.cook_id, u.id as consumer_id, u.name as consumer_name, d.status as delivery_status, d.id as delivery_id
        FROM requests r
        JOIN posts p ON r.post_id = p.id
        JOIN users u ON r.consumer_id = u.id
        LEFT JOIN deliveries d ON d.request_id = r.id
        WHERE p.cook_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.params.cook_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης αιτημάτων.' });
        res.json(rows);
    });
});

// Έγκριση αιτήματος (παίρνει post_id από τη βάση, όχι από τον client)
router.post('/approve', (req, res) => {
    const { request_id } = req.body;
    db.get(`SELECT id, status, post_id FROM requests WHERE id = ?`, [request_id], (err, reqRow) => {
        if (err || !reqRow) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (reqRow.status !== 'pending') return res.status(400).json({ error: 'Το αίτημα δεν εκκρεμεί.' });

        db.get(`SELECT portions_available FROM posts WHERE id = ?`, [reqRow.post_id], (err, post) => {
            if (err || !post) return res.status(404).json({ error: 'Σφάλμα.' });
            if (post.portions_available <= 0) return res.status(400).json({ error: 'Δεν υπάρχουν άλλες μερίδες!' });

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run(`UPDATE requests SET status = 'approved' WHERE id = ?`, [request_id]);
                db.run(`UPDATE posts SET portions_available = portions_available - 1 WHERE id = ?`, [reqRow.post_id]);
                db.run(`INSERT INTO deliveries (request_id) VALUES (?)`, [request_id], function(err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
                    db.run("COMMIT");
                    res.json({ message: 'Το αίτημα εγκρίθηκε.' });
                });
            });
        });
    });
});

// Απόρριψη αιτήματος (+1 credit επιστροφή στον καταναλωτή)
router.post('/reject', (req, res) => {
    const { request_id } = req.body;
    db.get(`SELECT consumer_id, status FROM requests WHERE id = ?`, [request_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Αίτημα δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Μόνο εκκρεμή αιτήματα μπορούν να απορριφθούν.' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run(`UPDATE requests SET status = 'rejected' WHERE id = ?`, [request_id]);
            db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [row.consumer_id]);
            db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, 1, 'request_rejected_refund', 'request', ?)`, [row.consumer_id, request_id], function(err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα.' }); }
                db.run('COMMIT');
                res.json({ message: 'Το αίτημα απορρίφθηκε.' });
            });
        });
    });
});

// Ολοκλήρωση Παράδοσης (Από μάγειρα)
router.post('/complete-delivery', (req, res) => {
    db.get(`SELECT status FROM deliveries WHERE id = ?`, [req.body.delivery_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Η παράδοση έχει ήδη ολοκληρωθεί ή ακυρωθεί.' });

        db.run(`UPDATE deliveries SET status = 'completed', created_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.body.delivery_id], (err) => {
            if (err) return res.status(500).json({ error: 'Σφάλμα.' });
            res.json({ message: 'Η παράδοση ολοκληρώθηκε επιτυχώς.' });
        });
    });
});

// No-show (Ο καταναλωτής δεν ήρθε -> -1 credit + ledger)
router.post('/noshow', (req, res) => {
    const { delivery_id, consumer_id } = req.body;
    db.get(`SELECT status FROM deliveries WHERE id = ?`, [delivery_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Η παράδοση έχει ήδη ολοκληρωθεί ή ακυρωθεί.' });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`UPDATE deliveries SET status = 'failed' WHERE id = ?`, [delivery_id]);
            db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [consumer_id]);
            db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 'no_show_penalty', 'delivery', ?)`, [consumer_id, delivery_id], function(err) {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
                db.run("COMMIT");
                res.json({ message: 'Καταγράφηκε ως No-Show. Αφαιρέθηκε 1 πόντος από τον χρήστη.' });
            });
        });
    });
});

// Ανάκτηση Ιστορικού Καταναλωτή
router.get('/consumer-history/:user_id', (req, res) => {
    const query = `
        SELECT r.id as request_id, r.status as req_status, p.title, p.cook_id, u.name as cook_name, d.id as delivery_id, d.status as del_status, rt.score
        FROM requests r
        JOIN posts p ON r.post_id = p.id
        JOIN users u ON p.cook_id = u.id
        LEFT JOIN deliveries d ON d.request_id = r.id
        LEFT JOIN ratings rt ON rt.delivery_id = d.id AND rt.rater_id = r.consumer_id
        WHERE r.consumer_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα.' });
        res.json(rows);
    });
});

// Βαθμολογία (Rating) -> +1 credit στον μάγειρα αν score > 3 + ledger
router.post('/rate', (req, res) => {
    const { delivery_id, rater_id, cook_id, score, comment } = req.body;
    db.get(`SELECT id FROM ratings WHERE delivery_id = ?`, [delivery_id], (err, existing) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
        if (existing) return res.status(400).json({ error: 'Έχετε ήδη βαθμολογήσει αυτή την παραγγελία.' });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`INSERT INTO ratings (delivery_id, rater_id, score, comment) VALUES (?, ?, ?, ?)`, [delivery_id, rater_id, score, comment]);

            if (score > 3) {
                db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [cook_id]);
                db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, 1, 'good_rating_bonus', 'delivery', ?)`, [cook_id, delivery_id]);
            }
            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ error: 'Σφάλμα.' });
                res.json({ message: 'Η βαθμολογία καταχωρήθηκε!' });
            });
        });
    });
});

module.exports = router;
