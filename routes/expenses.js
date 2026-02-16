const express = require('express');
const router = express.Router();
const db = require('../models');
const Expense = db.Expense;
const verifyToken = require('../middleware/authMiddleware');

// Get all expenses
router.get('/', verifyToken, async (req, res) => {
    try {
        const expenses = await Expense.findAll({
            include: [{ model: db.User, as: 'user', attributes: ['username'] }],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(expenses);
    } catch (err) {
        console.error("Error fetching expenses:", err);
        res.status(500).json({ message: "Error fetching expenses" });
    }
});

// Add new expense
router.post('/', verifyToken, async (req, res) => {
    const { category, amount, description, date } = req.body;

    try {
        const newExpense = await Expense.create({
            category,
            amount,
            description,
            date: date || new Date(),
            userId: req.userId
        });
        res.status(201).json(newExpense);
    } catch (err) {
        console.error("Error adding expense:", err);
        res.status(400).json({ message: "Error adding expense" });
    }
});

// Delete expense
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await Expense.destroy({
            where: { id: req.params.id }
        });
        if (result === 1) {
            res.json({ message: "Expense deleted" });
        } else {
            res.status(404).json({ message: "Expense not found" });
        }
    } catch (err) {
        console.error("Error deleting expense:", err);
        res.status(500).json({ message: "Error deleting expense" });
    }
});

// Update expense
router.put('/:id', verifyToken, async (req, res) => {
    const { category, amount, description, date } = req.body;
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        await expense.update({
            category,
            amount,
            description,
            date: date || expense.date
        });
        res.json(expense);
    } catch (err) {
        console.error("Error updating expense:", err);
        res.status(400).json({ message: "Error updating expense" });
    }
});

module.exports = router;

