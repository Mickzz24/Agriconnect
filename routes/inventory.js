const express = require('express');
const router = express.Router();
const { Inventory, OrderItem, User } = require('../models');

// Get all inventory items
router.get('/', async (req, res) => {
    try {
        const items = await Inventory.findAll();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new inventory item
router.post('/', async (req, res) => {
    try {
        const { item_name, category, quantity, unit_price, cost_price, threshold, unit, expiry_date } = req.body;
        const newItem = await Inventory.create({ item_name, category, quantity, unit_price, cost_price, threshold, unit, expiry_date });
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, category, quantity, unit_price, cost_price, threshold, unit, expiry_date } = req.body;
        const item = await Inventory.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const oldQuantity = item.quantity;

        await item.update({ item_name, category, quantity, unit_price, cost_price, threshold, unit, expiry_date });

        // Check for Replenishment (Quantity Increased)
        // Ensure quantity is a number
        if (quantity > oldQuantity) {
            const addedQty = quantity - oldQuantity;
            // Send Alert Async
            (async () => {
                try {
                    const recipients = await User.findAll({ where: { role: ['owner', 'staff', 'accountant'] } });
                    const emails = recipients.map(u => u.email).filter(e => e);
                    if (emails.length > 0) {
                        const { sendReplenishmentAlert } = require('../utils/emailService');
                        await sendReplenishmentAlert(emails, item.item_name, addedQty, quantity);
                    }
                } catch (e) {
                    console.error("Error sending replenishment alert:", e);
                }
            })();
        }

        res.json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Inventory.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Check for associated orders
        const associatedOrders = await OrderItem.count({ where: { inventoryId: id } });
        if (associatedOrders > 0) {
            return res.status(400).json({ error: 'Cannot delete item because it is part of existing orders.' });
        }

        await item.destroy();
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
