require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

const db = require('../models');

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Note: Vercel serves static files automatically based on vercel.json
// app.use(express.static('public')); 

// Routes
const authRoutes = require('../routes/auth');
const inventoryRoutes = require('../routes/inventory');
const userRoutes = require('../routes/users');
const orderRoutes = require('../routes/orders');
const expenseRoutes = require('../routes/expenses');
const reportRoutes = require('../routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "ok", environment: "vercel-serverless" });
});

module.exports = app;
