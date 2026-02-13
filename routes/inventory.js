const express = require('express');
const router = express.Router();
const { Inventory } = require('../models');

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
        const { item_name, category, quantity, unit_price, cost_price, threshold } = req.body;
        const newItem = await Inventory.create({ item_name, category, quantity, unit_price, cost_price, threshold });
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, category, quantity, unit_price, cost_price, threshold } = req.body;
        const item = await Inventory.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        await item.update({ item_name, category, quantity, unit_price, cost_price, threshold });
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

        await item.destroy();
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
