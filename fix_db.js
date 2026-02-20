const db = require('./models');

async function fixDatabase() {
    try {
        console.log("Attempting to add 'status' column to Users table...");

        // Try raw query for SQLite as it's often safer/simpler for single column add
        try {
            await db.sequelize.query("ALTER TABLE Users ADD COLUMN status VARCHAR(255) DEFAULT 'Active';");
            console.log("✅ Column 'status' added successfully via SQL.");
        } catch (sqlErr) {
            if (sqlErr.message.includes("duplicate column name")) {
                console.log("ℹ️ Column 'status' already exists.");
            } else {
                console.warn("⚠️ SQL Alter failed, trying sync({alter: true})...", sqlErr.message);
                await db.sequelize.sync({ alter: true });
                console.log("✅ Database synced with alter: true.");
            }
        }

    } catch (error) {
        console.error("❌ Database fix failed:", error);
    } finally {
        await db.sequelize.close();
    }
}

fixDatabase();
