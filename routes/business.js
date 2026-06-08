const express = require('express');
const router = express.Router();
const db = require('../database');

// Αποστολή αιτήματος (Δέσμευση μερίδας)
router.post('/request', (req, res) => {
    const { post_id, consumer_id } = req.body;
    db.get(`SELECT credits FROM users WHERE id = ?`, [consumer_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Σφάλμα χρήστη.' });
        if (user.credits < 1) return res.status(403).json({ error: 'Δεν έχεις αρκετούς πόντους.' });

        db.run(`INSERT INTO requests (post_id, consumer_id) VALUES (?, ?)`, [post_id, consumer_id], function(err) {
            if (err) return res.status(500).json({ error: 'Σφάλμα αιτήματος.' });
            res.status(201).json({ message: 'Το αίτημα στάλθηκε στον μάγειρα!' });
        });
    });
});

// Ανάκτηση αιτημάτων για τον Μάγειρα
router.get('/cook-requests/:cook_id', (req, res) => {
    const query = `
        SELECT r.id as request_id, r.status, p.title, p.cook_id, u.id as consumer_id, u.name as consumer_name, d.status as delivery_status, d.id as delivery_id
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

// Έγκριση αιτήματος
router.post('/approve', (req, res) => {
    const { request_id, post_id } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(`UPDATE requests SET status = 'approved' WHERE id = ?`, [request_id]);
        db.run(`UPDATE posts SET portions_available = portions_available - 1 WHERE id = ?`, [post_id]);
        db.run(`INSERT INTO deliveries (request_id) VALUES (?)`, [request_id], function(err) {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
            db.run("COMMIT");
            res.json({ message: 'Το αίτημα εγκρίθηκε.' });
        });
    });
});

// Απόρριψη αιτήματος
router.post('/reject', (req, res) => {
    db.run(`UPDATE requests SET status = 'rejected' WHERE id = ?`, [req.body.request_id], (err) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα.' });
        res.json({ message: 'Το αίτημα απορρίφθηκε.' });
    });
});

// Ολοκλήρωση Παράδοσης (Από μάγειρα)
router.post('/complete-delivery', (req, res) => {
    db.run(`UPDATE deliveries SET status = 'completed' WHERE id = ?`, [req.body.delivery_id], (err) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα.' });
        res.json({ message: 'Η παράδοση ολοκληρώθηκε επιτυχώς.' });
    });
});

// No-show (Ο καταναλωτής δεν ήρθε -> -1 credit)
router.post('/noshow', (req, res) => {
    const { delivery_id, consumer_id } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(`UPDATE deliveries SET status = 'failed' WHERE id = ?`, [delivery_id]);
        db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [consumer_id], function(err) {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
            db.run("COMMIT");
            res.json({ message: 'Καταγράφηκε ως No-Show. Αφαιρέθηκε 1 πόντος από τον χρήστη.' });
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
        LEFT JOIN ratings rt ON rt.delivery_id = d.id
        WHERE r.consumer_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα.' });
        res.json(rows);
    });
});

// Βαθμολογία (Rating) -> Δίνει πόντους στον μάγειρα αν score > 3
router.post('/rate', (req, res) => {
    const { delivery_id, rater_id, cook_id, score, comment } = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(`INSERT INTO ratings (delivery_id, rater_id, score, comment) VALUES (?, ?, ?, ?)`, [delivery_id, rater_id, score, comment]);
        
        if (score > 3) {
            db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [cook_id]);
        }
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: 'Σφάλμα.' });
            res.json({ message: 'Η βαθμολογία καταχωρήθηκε!' });
        });
    });
});

module.exports = router;
