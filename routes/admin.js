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

// Δ2. Leaderboard (Top Donors)
router.get('/leaderboard', (req, res) => {
    const query = `
        SELECT u.name, SUM(p.portions_total) as total_portions_donated
        FROM users u
        JOIN posts p ON u.id = p.cook_id
        GROUP BY u.id
        ORDER BY total_portions_donated DESC
        LIMIT 5
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
        res.json(rows);
    });
});

module.exports = router;
