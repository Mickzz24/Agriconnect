const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;
const verifyToken = require('./middleware/authMiddleware');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' directory

const db = require('./models');

// Routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

// Protected Route for Dashboard Verification
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({
            id: user.id,
            username: user.username,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
db.sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
