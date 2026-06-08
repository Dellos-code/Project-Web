const express = require('express');
const router = express.Router();
const db = require('../database');

// Δ1. Συνολικά Στατιστικά (Επιτυχείς παραδόσεις τον τελευταίο μήνα)
router.get('/stats', (req, res) => {
    const query = `
        SELECT COUNT(*) as total_deliveries 
        FROM deliveries 
        WHERE status = 'completed' AND created_at >= datetime('now', '-1 month')
    `;
    db.get(query, [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
        res.json({ total_deliveries: row ? row.total_deliveries : 0 });
    });
});

// Δ2. Leaderboard (Top Donors και Highest-rated meals)
router.get('/leaderboard', (req, res) => {
    const donorsQuery = `
        SELECT u.name, SUM(p.portions_total) as total_portions_donated
        FROM users u
        JOIN posts p ON u.id = p.cook_id
        GROUP BY u.id
        ORDER BY total_portions_donated DESC
        LIMIT 5
    `;
    const mealsQuery = `
        SELECT p.title, u.name as cook_name, AVG(r.score) as avg_score
        FROM ratings r
        JOIN deliveries d ON r.delivery_id = d.id
        JOIN requests req ON d.request_id = req.id
        JOIN posts p ON req.post_id = p.id
        JOIN users u ON p.cook_id = u.id
        GROUP BY p.id
        ORDER BY avg_score DESC
        LIMIT 5
    `;
    
    db.all(donorsQuery, [], (err, donors) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
        db.all(mealsQuery, [], (err, meals) => {
            if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
            res.json({ donors, meals });
        });
    });
});

module.exports = router;
