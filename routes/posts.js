const express = require('express');
const router = express.Router();
const db = require('../database');

// Δημιουργία αγγελίας
router.post('/', (req, res) => {
    const { cook_id, title, notes, photo_url, pickup_location, pickup_time, portions, allergens } = req.body;
    if (!cook_id || !title || !pickup_location || !pickup_time || !portions) return res.status(400).json({ error: 'Λείπουν υποχρεωτικά πεδία.' });

    const query = `
        INSERT INTO posts 
        (cook_id, title, notes, photo_url, pickup_location, pickup_time, portions_total, portions_available, allergens, expires_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+48 hours'))
    `;
    const params = [cook_id, title, notes, photo_url, pickup_location, pickup_time, portions, portions, allergens];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Σφάλμα κατά τη δημιουργία αγγελίας.' });
        res.status(201).json({ message: 'Η αγγελία δημιουργήθηκε.', postId: this.lastID });
    });
});

// Ανάκτηση ΟΛΩΝ των ενεργών (Για το Feed)
router.get('/', (req, res) => {
    const query = `
        SELECT p.*, u.name as cook_name 
        FROM posts p
        JOIN users u ON p.cook_id = u.id
        WHERE p.expires_at > datetime('now')
        ORDER BY p.created_at DESC
    `;
    db.all(query, [], (err, posts) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης.' });
        res.json(posts);
    });
});

// Ανάκτηση αγγελιών ενός Μάγειρα (Για το Dashboard του)
router.get('/cook/:id', (req, res) => {
    const query = `SELECT * FROM posts WHERE cook_id = ? ORDER BY created_at DESC`;
    db.all(query, [req.params.id], (err, posts) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης.' });
        res.json(posts);
    });
});

// Επεξεργασία αγγελίας (CRUD)
router.put('/:id', (req, res) => {
    const { title, notes, photo_url, pickup_location, pickup_time, portions, allergens } = req.body;
    
    // Validate portions is >= portions_total - portions_available
    const checkQuery = `SELECT portions_total, portions_available FROM posts WHERE id = ?`;
    db.get(checkQuery, [req.params.id], (err, post) => {
        if (err || !post) return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε.' });
        
        const reserved = post.portions_total - post.portions_available;
        if (portions < reserved) {
            return res.status(400).json({ error: \`Δεν μπορείτε να μειώσετε τις μερίδες κάτω από \${reserved} (έχουν ήδη κρατηθεί).\` });
        }
        
        const newAvailable = portions - reserved;

        const query = `
            UPDATE posts 
            SET title = ?, notes = ?, photo_url = ?, pickup_location = ?, pickup_time = ?, portions_total = ?, portions_available = ?, allergens = ?
            WHERE id = ?
        `;
        const params = [title, notes, photo_url, pickup_location, pickup_time, portions, newAvailable, allergens, req.params.id];

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: 'Σφάλμα ενημέρωσης.' });
            res.json({ message: 'Η αγγελία ενημερώθηκε.' });
        });
    });
});

// Διαγραφή αγγελίας (CRUD)
router.delete('/:id', (req, res) => {
    db.run(`DELETE FROM posts WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Σφάλμα διαγραφής.' });
        res.json({ message: 'Η αγγελία διαγράφηκε.' });
    });
});

module.exports = router;
