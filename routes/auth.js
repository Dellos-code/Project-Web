const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../database');

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Όλα τα πεδία είναι υποχρεωτικά.' });

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const insertUserQuery = `INSERT INTO users (name, email, password_hash, credits) VALUES (?, ?, ?, 5)`;
            
            db.run(insertUserQuery, [name, email, passwordHash], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Το email υπάρχει ήδη.' });
                    return res.status(500).json({ error: 'Σφάλμα κατά την εγγραφή.' });
                }

                const newUserId = this.lastID;
                const ledgerQuery = `INSERT INTO credit_ledger (user_id, delta, reason) VALUES (?, 5, 'registration_bonus')`;
                
                db.run(ledgerQuery, [newUserId], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: 'Σφάλμα κατά την απόδοση πόντων.' });
                    }
                    db.run("COMMIT");
                    res.status(201).json({ message: 'Επιτυχής εγγραφή!', userId: newUserId });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Εσωτερικό σφάλμα διακομιστή.' });
    }
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email και κωδικός είναι υποχρεωτικά.' });

    const query = `SELECT id, name, password_hash, role, credits FROM users WHERE email = ?`;
    db.get(query, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης δεδομένων.' });
        if (!user) return res.status(401).json({ error: 'Λάθος email ή κωδικός.' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Λάθος email ή κωδικός.' });

        res.json({ message: 'Επιτυχής σύνδεση.', user: { id: user.id, name: user.name, role: user.role, credits: user.credits } });
    });
});

module.exports = router;
