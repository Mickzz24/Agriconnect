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
        // Role-based filtering
        if (req.userRole === 'deliverer') {
            whereClause.delivererId = req.userId;
        } else if (req.userRole !== 'owner' && req.userRole !== 'staff') {
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
    const { customer_name, items, status, order_type } = req.body;
    console.log("Creating order with body:", req.body);

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "Order must contain items" });
    }

    const t = await db.sequelize.transaction();

    try {
        let total_amount = 0;
        const targetStatus = status || (req.userRole === 'user' ? 'Pending' : 'Delivered');

        // Calculate total and verify stock
        for (const item of items) {
            const product = await Inventory.findByPk(item.inventoryId);
            if (!product) {
                await t.rollback();
                return res.status(404).json({ message: `Product ID ${item.inventoryId} not found` });
            }
            // Always check stock regardless of deduction status
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
            status: targetStatus,
            payment_method: req.body.payment_method, // Added payment method
            order_type: order_type || (req.userRole === 'user' ? 'Online' : 'Offline')
        }, { transaction: t });

        // Create Order Items and Update Inventory (ONLY IF NOT PENDING)
        for (const item of items) {
            const product = await Inventory.findByPk(item.inventoryId);

            await OrderItem.create({
                orderId: newOrder.id,
                inventoryId: item.inventoryId,
                quantity: item.quantity,
                price: product.unit_price,
                cost_price: product.cost_price || 0 // Capture current cost
            }, { transaction: t });

            // Deduct stock ONLY if status is NOT 'Pending'
            if (targetStatus !== 'Pending') {
                await product.update({
                    quantity: product.quantity - item.quantity
                }, { transaction: t });

                // Check for Low Stock after deduction
                if (product.quantity <= product.threshold) {
                    try {
                        const recipients = await db.User.findAll({ where: { role: ['owner', 'staff', 'accountant'] } });
                        const emails = recipients.map(u => u.email).filter(e => e);
                        if (emails.length > 0) {
                            const { sendLowStockAlert } = require('../utils/emailService');
                            sendLowStockAlert(emails, product.item_name, product.quantity).catch(console.error);
                        }
                    } catch (e) {
                        console.error('Failed to trigger low stock alert:', e);
                    }
                }
            }
        }

        await t.commit();

        // --- Send Email Notifications (Async) ---
        (async () => {
            try {
                const { sendOrderConfirmation, sendNewOrderAlert } = require('../utils/emailService');
                const user = await db.User.findByPk(req.userId);

                // 1. Send Confirmation to User
                if (user && user.email) {
                    // Need item names, so we might need to map items array to names if not already there.
                    // The 'items' in body has inventoryId. We fetched products earlier.
                    // For simplicity, let's just use the logic that we have access to 'items' loop or re-fetch.
                    // Since we are outside the transaction/loop now, we can structure a basic list.
                    // A better way is to accumulate details in the loop above.
                    // Let's re-fetch the order with includes to be clean.
                    const fullOrder = await Order.findByPk(newOrder.id, {
                        include: [{ model: OrderItem, as: 'items', include: [Inventory] }]
                    });

                    const orderItems = fullOrder.items.map(i => ({
                        name: i.Inventory ? i.Inventory.item_name : 'Item',
                        quantity: i.quantity,
                        price: i.price
                    }));

                    await sendOrderConfirmation(user.email, newOrder.id, orderItems, total_amount);
                }

                // 2. Send Alert to Staff/Owner/Accountant
                const recipients = await db.User.findAll({ where: { role: ['owner', 'staff', 'accountant'] } });
                const emails = recipients.map(u => u.email).filter(e => e);
                if (emails.length > 0) {
                    await sendNewOrderAlert(emails, newOrder.id, user ? user.username : customer_name, total_amount);
                }

            } catch (e) {
                console.error("Error sending order emails:", e);
            }
        })();

        res.status(201).json({ message: "Order created successfully", orderId: newOrder.id });

    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error("Error creating order:", err);
        res.status(500).json({ message: "Error creating order" });
    }
});

// Update order status
router.put('/:id/status', verifyToken, async (req, res) => {
    const { status, delivererId } = req.body;
    const t = await db.sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: db.User, as: 'User' } // Fetch user for email
            ]
        });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: "Order not found" });
        }

        const oldStatus = order.status;
        const updates = { status };

        // --- Logic based on status transitions ---

        // 1. DEDUCT STOCK: When moving from Pending to (Packed / Shipped / Delivered)
        if (oldStatus === 'Pending' && ['Packed', 'Shipped', 'Delivered'].includes(status)) {
            for (const item of order.items) {
                const product = await Inventory.findByPk(item.inventoryId);
                if (product) {
                    if (product.quantity < item.quantity) {
                        await t.rollback();
                        return res.status(400).json({ message: `Insufficient stock to pack order: ${product.item_name}` });
                    }
                    await product.update({ quantity: product.quantity - item.quantity }, { transaction: t });

                    // Check for Low Stock after deduction
                    if (product.quantity <= product.threshold) {
                        try {
                            const recipients = await db.User.findAll({ where: { role: ['owner', 'staff', 'accountant'] } });
                            const emails = recipients.map(u => u.email).filter(e => e);
                            if (emails.length > 0) {
                                const { sendLowStockAlert } = require('../utils/emailService');
                                sendLowStockAlert(emails, product.item_name, product.quantity).catch(console.error);
                            }
                        } catch (e) {
                            console.error('Failed to trigger low stock alert:', e);
                        }
                    }
                }
            }
        }

        // 2. RESTORE STOCK: When Cancelling after items were already packed/deducted
        if (status === 'Cancelled' && ['Packed', 'Shipped', 'Delivered'].includes(oldStatus)) {
            for (const item of order.items) {
                const product = await Inventory.findByPk(item.inventoryId);
                if (product) {
                    await product.update({ quantity: product.quantity + item.quantity }, { transaction: t });
                }
            }
        }

        // 3. SHIPPED: Assign deliverer
        if (status === 'Shipped') {
            updates.delivererId = delivererId || req.userId; // Default to current user if none provided
        }

        // 4. DELIVERED: Add completion time
        if (status === 'Delivered') {
            updates.deliveryTime = new Date();
        }

        await order.update(updates, { transaction: t });
        await t.commit();

        // --- Send Email Notifications ---
        if (order.User && order.User.email && status !== oldStatus) {
            const { sendOrderStatusUpdate } = require('../utils/emailService');
            sendOrderStatusUpdate(order.User.email, order.id, status).catch(console.error);
        }

        res.json({ message: "Order status updated", status });
    } catch (err) {
        if (!t.finished) await t.rollback(); // Check if finished to avoid double-rollback if commit succeeded but email failed (though await commit is above)
        // Actually commit is awaited, so catch only catches commit errors or logic before.
        // If commit succeeds, we are here only if email block throws synchronously? No, email is in try block.
        // If email fails synchronously, we shouldn't rollback committed transaction.
        // Correct pattern: Move email logic AFTER commit, or separate try/catch.
        // But t.finished check handles the rollback safely.
        console.error("Error updating order:", err);
        res.status(500).json({ message: "Error updating order" });
    }
});

// Delete order and recover stock
router.delete('/:id', verifyToken, async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{ model: OrderItem, as: 'items' }]
        });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: "Order not found" });
        }

        // Recover stock if order wasn't already cancelled (since Cancelled already recovered it)
        // AND if order wasn't Pending (since Pending never deducted it)
        if (order.status !== 'Cancelled' && order.status !== 'Pending') {
            for (const item of order.items) {
                const product = await Inventory.findByPk(item.inventoryId);
                if (product) {
                    await product.update({ quantity: product.quantity + item.quantity }, { transaction: t });
                }
            }
        }

        // Delete items first (due to FK)
        await OrderItem.destroy({ where: { orderId: order.id }, transaction: t });
        await order.destroy({ transaction: t });

        await t.commit();
        res.json({ message: "Order deleted and stock recovered" });
    } catch (err) {
        await t.rollback();
        console.error("Error deleting order:", err);
        res.status(500).json({ message: "Error deleting order" });
    }
});

module.exports = router;
