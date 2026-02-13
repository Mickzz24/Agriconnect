const express = require('express');
const router = express.Router();
const db = require('../models');
const User = db.User;
const verifyToken = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Get all users (Protected)
router.get('/', verifyToken, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'createdAt']
        });
        res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).send({ message: "Error fetching users." });
    }
});

// Add a new user/staff (Protected)
router.post('/', verifyToken, async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        const hashedPassword = bcrypt.hashSync(password, 8);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'staff'
        });

        res.status(201).send({ message: "User registered successfully!", userId: newUser.id });
    } catch (err) {
        console.error("Error adding user:", err);
        res.status(500).send({ message: err.message || "Error adding user." });
    }
});

// Delete a user (Protected)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await User.destroy({
            where: { id: req.params.id }
        });

        if (result === 1) {
            res.status(200).send({ message: "User deleted successfully." });
        } else {
            res.status(404).send({ message: "User not found." });
        }
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).send({ message: "Error deleting user." });
    }
});

module.exports = router;
