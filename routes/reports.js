const express = require('express');
const router = express.Router();
const db = require('../models');
const { Order, OrderItem, Inventory, Expense, User } = db;
const { Op } = require('sequelize');
const verifyToken = require('../middleware/authMiddleware');

// Dashboard Stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Orders
        const ordersToday = await Order.count({
            where: { createdAt: { [Op.gte]: today } }
        });
        const ordersThisMonth = await Order.count({
            where: { createdAt: { [Op.gte]: firstDayOfMonth } }
        });

        // Revenue (Total amount of all orders - simplified)
        // Ideally should filter by status != Cancelled
        const revenueTodayData = await Order.sum('total_amount', {
            where: {
                createdAt: { [Op.gte]: today },
                status: { [Op.ne]: 'Cancelled' }
            }
        }) || 0;

        const revenueTotalData = await Order.sum('total_amount', {
            where: { status: { [Op.ne]: 'Cancelled' } }
        }) || 0;

        // Expenses
        const expensesTotal = await Expense.sum('amount') || 0;

        // COGS Calculation (Sum of (item quantity * cost_price) for all sold items)
        // This is complex in Sequelize without raw query or iterating.
        // For MVP, we'll iterate recent orders or use a simplified approximation if strictly needed.
        // Let's try to get it right: Join OrderItems with Inventory to get cost_price

        const soldItems = await OrderItem.findAll({
            include: [{ model: Order, where: { status: { [Op.ne]: 'Cancelled' } } }, { model: Inventory }]
        });

        let totalCOGS = 0;
        soldItems.forEach(item => {
            const cost = item.Inventory ? item.Inventory.cost_price : 0;
            totalCOGS += cost * item.quantity;
        });

        const grossProfit = revenueTotalData - totalCOGS;
        const netProfit = grossProfit - expensesTotal;

        // Low Stock
        const lowStockCount = await Inventory.count({
            where: {
                quantity: { [Op.lte]: db.sequelize.col('threshold') }
            }
        });

        // Pending Deliverers
        const pendingDeliverers = await User.count({
            where: {
                role: 'deliverer',
                is_approved: false
            }
        });

        res.json({
            orders: {
                today: ordersToday,
                month: ordersThisMonth
            },
            revenue: {
                today: revenueTodayData,
                total: revenueTotalData
            },
            financials: {
                expenses: expensesTotal,
                cogs: totalCOGS,
                grossProfit,
                netProfit
            },
            inventory: {
                lowStock: lowStockCount
            },
            users: {
                pendingDeliverers
            }
        });

    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
});

module.exports = router;
