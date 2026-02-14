const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const User = db.User;

const SECRET_KEY = 'supersecretkey'; // In production, use environment variable

// Register Endpoint
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        const hashedPassword = bcrypt.hashSync(password, 8);
        const userRole = role || 'staff'; // Default to staff

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: userRole
        });

        // Create token provided upon registration success for immediate login
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: 86400 }); // 24 hours
        res.status(200).send({ auth: true, token: token, role: user.role });
    } catch (err) {
        console.error("Error registering user:", err);
        return res.status(500).send({ message: "Error registering user." });
    }
});

// Login Endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) return res.status(404).send({ message: "No user found." });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: 86400 }); // 24 hours
        res.status(200).send({ auth: true, token: token, role: user.role });
    } catch (err) {
        console.error("Error logging in:", err);
        return res.status(500).send({ message: "Error on the server." });
    }
});

module.exports = router;
