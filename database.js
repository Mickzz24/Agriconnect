const sqlite3 = require('sqlite3').verbose();
const dbName = 'database.sqlite';

const db = new sqlite3.Database(dbName, (err) => {
    if (err) {
        console.error('Error opening database ' + dbName + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user'
        )`, (err) => {
            if (err) {
                console.error('Error creating table: ' + err.message);
            }
        });
    }
});

module.exports = db;
