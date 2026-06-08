const cron = require('node-cron');
const db = require('./database');

function startCronJobs() {
    // Run every hour
    cron.schedule('0 * * * *', () => {
        console.log('Running rating penalty cron job...');
        
        // Find deliveries that are completed, older than 48h, and have no rating
        const query = `
            SELECT d.id as delivery_id, r.consumer_id as consumer_id 
            FROM deliveries d
            JOIN requests r ON d.request_id = r.id
            WHERE d.status = 'completed'
            AND d.created_at <= datetime('now', '-48 hours')
            AND NOT EXISTS (
                SELECT 1 FROM ratings WHERE delivery_id = d.id AND rater_id = r.consumer_id
            )
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching unrated deliveries:', err);
                return;
            }

            rows.forEach(row => {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [row.consumer_id]);
                    db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 'No rating penalty', 'delivery', ?)`, [row.consumer_id, row.delivery_id]);
                    db.run(`INSERT INTO ratings (delivery_id, rater_id, score, comment) VALUES (?, ?, 3, 'System auto-rating due to timeout')`, [row.delivery_id, row.consumer_id], function(err) {
                        if (err) {
                            console.error('Error in transaction, rolling back:', err);
                            db.run('ROLLBACK');
                        } else {
                            db.run('COMMIT');
                            console.log(`Penalty applied to consumer ${row.consumer_id} for delivery ${row.delivery_id}`);
                        }
                    });
                });
            });
        });
    });
}

module.exports = startCronJobs;
