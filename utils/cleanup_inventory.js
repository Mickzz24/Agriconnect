const db = require('../models');

async function cleanupInventory() {
    try {
        console.log("Starting Inventory Cleanup...");

        // 1. DELETE DUPLICATE BLUEBERRIES
        // Find all items with "Blueberry" in the name
        const blueberries = await db.Inventory.findAll({
            where: {
                item_name: { [db.Sequelize.Op.like]: '%Blueberry%' }
            },
            order: [['createdAt', 'DESC']] // Newest first
        });

        if (blueberries.length > 1) {
            console.log(`Found ${blueberries.length} Blueberry items. Keeping the newest one.`);
            // Keep the first (newest), delete the rest
            const toKeep = blueberries[0];
            const toDelete = blueberries.slice(1);

            for (const item of toDelete) {
                // Check if used in orders before deleting? 
                // For cleanup, let's force delete or just set qty to 0 if we want to be safe.
                // But user wants them gone. 
                // Let's destroy. Note: This might fail if constraints exist, but we'll try.
                try {
                    await item.destroy();
                    console.log(`Deleted duplicate Blueberry ID: ${item.id}`);
                } catch (e) {
                    console.error(`Could not delete ID ${item.id}: ${e.message}`);
                }
            }

            // Fix the kept one
            toKeep.quantity = 50; // Set to realistic
            toKeep.unit_price = 12.00; // Realistic price
            await toKeep.save();
            console.log(`Updated kept Blueberry ID: ${toKeep.id} to qty 50.`);
        } else if (blueberries.length === 1) {
            const item = blueberries[0];
            if (item.quantity > 1000) {
                item.quantity = 50;
                await item.save();
                console.log(`Normalized single Blueberry ID: ${item.id} qty to 50.`);
            }
        }

        // 2. CAP HIGH QUANTITIES
        const allItems = await db.Inventory.findAll();
        for (const item of allItems) {
            if (item.quantity > 1000) {
                console.log(`Item ${item.item_name} (ID: ${item.id}) has high qty: ${item.quantity}. Capping to 100.`);
                item.quantity = 100;
                await item.save();
            }
        }

        console.log("Cleanup Complete!");
        process.exit(0);

    } catch (err) {
        console.error("Cleanup Failed:", err);
        process.exit(1);
    }
}

// execute
cleanupInventory();
