const jwt = require('jsonwebtoken');
const SECRET_KEY = 'supersecretkey'; // In production, use environment variable

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to authenticate token.' });
        }
        // If everything good, save to request for use in other routes
        req.userId = decoded.id;
        next();
    });
};

module.exports = verifyToken;
