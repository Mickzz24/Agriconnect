const sqlite3 = require('sqlite3').verbose();
const dbName = 'database.sqlite';

const db = new sqlite3.Database(dbName, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to database.');

    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        if (err) {
            // Ignore error if column already exists
            if (err.message.includes('duplicate column name')) {
                console.log('Column "role" already exists.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Successfully added "role" column.');
        }
    });
});
