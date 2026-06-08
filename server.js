const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Η βάση σου παραμένει ίδια, έχει ήδη τους σωστούς πίνακες!
const startCronJobs = require('./cron');

const app = express();
const PORT = process.env.PORT || 3000;

startCronJobs();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Εισαγωγή των Routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const businessRoutes = require('./routes/business');
const adminRoutes = require('./routes/admin'); // ΝΕΟ: Διαχειριστής

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/admin', adminRoutes); // ΝΕΟ

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Ο διακομιστής UniBite λειτουργεί τέλεια!' });
});

app.listen(PORT, () => {
    console.log(`Ο διακομιστής ξεκίνησε στο http://localhost:${PORT}`);
});
