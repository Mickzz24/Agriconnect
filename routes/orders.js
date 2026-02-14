const express = require('express');
const router = express.Router();
const db = require('../models');
const Order = db.Order;
const OrderItem = db.OrderItem;
const Inventory = db.Inventory;
const verifyToken = require('../middleware/authMiddleware');

// Get all orders (with items)
router.get('/', verifyToken, async (req, res) => {
    try {
        const whereClause = {};
        // If not owner or staff, only see own orders
        if (req.userRole !== 'owner' && req.userRole !== 'staff') {
            whereClause.userId = req.userId;
        }

        const orders = await Order.findAll({
            where: whereClause,
            include: [{
                model: OrderItem,
                as: 'items',
                include: [Inventory] // Include product details
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ message: "Error fetching orders" });
    }
});

// Create new order
router.post('/', verifyToken, async (req, res) => {
    const { customer_name, items } = req.body; // items: [{ inventoryId, quantity }]

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "Order must contain items" });
    }

    const t = await db.sequelize.transaction();

    try {
        let total_amount = 0;

        // Calculate total and verify stock
        for (const item of items) {
            const product = await Inventory.findByPk(item.inventoryId);
            if (!product) {
                await t.rollback();
                return res.status(404).json({ message: `Product ID ${item.inventoryId} not found` });
            }
            if (product.quantity < item.quantity) {
                await t.rollback();
                return res.status(400).json({ message: `Insufficient stock for ${product.item_name}` });
            }
            total_amount += product.unit_price * item.quantity;
        }

        // Create Order
        const newOrder = await Order.create({
            userId: req.userId,
            customer_name: customer_name || 'Customer',
            total_amount,
            status: 'Pending',
            order_type: req.body.order_type || (req.userRole === 'user' ? 'Online' : 'Offline')
        }, { transaction: t });

        // Create Order Items and Update Inventory
        for (const item of items) {
            const product = await Inventory.findByPk(item.inventoryId);

            await OrderItem.create({
                orderId: newOrder.id,
                inventoryId: item.inventoryId,
                quantity: item.quantity,
                price: product.unit_price
            }, { transaction: t });

            // Deduct stock
            await product.update({
                quantity: product.quantity - item.quantity
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ message: "Order created successfully", orderId: newOrder.id });

    } catch (err) {
        await t.rollback();
        console.error("Error creating order:", err);
        res.status(500).json({ message: "Error creating order" });
    }
});

// Update order status
router.put('/:id/status', verifyToken, async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        await order.update({ status });
        res.json({ message: "Order status updated", status });
    } catch (err) {
        console.error("Error updating order:", err);
        res.status(500).json({ message: "Error updating order" });
    }
});

module.exports = router;
