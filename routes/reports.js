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
        const expensesToday = await Expense.sum('amount', {
            where: { date: today }
        }) || 0;

        const expensesMonth = await Expense.sum('amount', {
            where: { date: { [Op.gte]: firstDayOfMonth } }
        }) || 0;

        const expensesTotal = await Expense.sum('amount') || 0;

        // Profit & Loss (Monthly)
        const revenueMonthData = await Order.sum('total_amount', {
            where: {
                createdAt: { [Op.gte]: firstDayOfMonth },
                status: { [Op.ne]: 'Cancelled' }
            }
        }) || 0;

        const soldItemsMonth = await OrderItem.findAll({
            include: [
                { model: Order, where: { createdAt: { [Op.gte]: firstDayOfMonth }, status: { [Op.ne]: 'Cancelled' } } },
                { model: Inventory }
            ]
        });

        let cogsMonth = 0;
        soldItemsMonth.forEach(item => {
            cogsMonth += (item.Inventory ? item.Inventory.cost_price : 0) * item.quantity;
        });

        const grossProfitMonth = revenueMonthData - cogsMonth;
        const netProfitMonth = grossProfitMonth - expensesMonth;

        // Pending Payments (Status = Pending)
        const pendingPaymentsCount = await Order.count({
            where: { status: 'Pending' }
        });

        // Other Stats
        const pendingOrders = await Order.count({ where: { status: 'Pending' } });
        const ordersToPack = await Order.count({
            where: { status: { [Op.in]: ['Paid', 'Approved'] } }
        });
        const ordersReadyForDelivery = await Order.count({ where: { status: 'Packed' } });

        res.json({
            orders: {
                today: ordersToday,
                month: ordersThisMonth,
                pending: pendingOrders,
                toPack: ordersToPack,
                readyForDelivery: ordersReadyForDelivery
            },
            revenue: {
                today: revenueTodayData,
                month: revenueMonthData,
                total: revenueTotalData
            },
            expenses: {
                today: expensesToday,
                month: expensesMonth,
                total: expensesTotal
            },
            financials: {
                monthlyProfit: netProfitMonth,
                pendingPayments: pendingPaymentsCount,
                netProfit: revenueTotalData - expensesTotal // Simple version
            }
        });

    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// Chart Data
router.get('/charts', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);

        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);

        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // 1. Today's Sales by Product (Pie)
        const todaySales = await OrderItem.findAll({
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.quantity')), 'totalQty'],
                [db.sequelize.col('Inventory.item_name'), 'itemName']
            ],
            include: [
                {
                    model: Order,
                    attributes: [],
                    where: {
                        createdAt: { [Op.gte]: today },
                        status: { [Op.ne]: 'Cancelled' }
                    }
                },
                { model: Inventory, attributes: [] }
            ],
            group: ['Inventory.item_name'],
            raw: true
        });

        // 2. Weekly Sales (Bar)
        const weeklySalesData = await Order.findAll({
            attributes: [
                [db.sequelize.fn('date', db.sequelize.col('createdAt')), 'day'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: {
                createdAt: { [Op.gte]: last7Days },
                status: { [Op.ne]: 'Cancelled' }
            },
            group: [db.sequelize.fn('date', db.sequelize.col('createdAt'))],
            raw: true
        });

        // 3. Monthly Sales (Line/Bar)
        const monthlySalesData = await Order.findAll({
            attributes: [
                [db.sequelize.fn('date', db.sequelize.col('createdAt')), 'day'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: {
                createdAt: { [Op.gte]: last30Days },
                status: { [Op.ne]: 'Cancelled' }
            },
            group: [db.sequelize.fn('date', db.sequelize.col('createdAt'))],
            raw: true
        });

        // 4. Yearly Sales (Bar)
        const yearlySalesData = await Order.findAll({
            attributes: [
                [db.sequelize.fn('strftime', '%m', db.sequelize.col('createdAt')), 'month'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: {
                createdAt: { [Op.gte]: startOfYear },
                status: { [Op.ne]: 'Cancelled' }
            },
            group: [db.sequelize.fn('strftime', '%m', db.sequelize.col('createdAt'))],
            raw: true
        });

        // 5. Expense Distribution (Pie)
        const expenseDistribution = await Expense.findAll({
            attributes: [
                'category',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['category'],
            raw: true
        });

        // 6. Financial Overview (Revenue vs Expenses vs Profit)
        // Grouped by month for the current year
        const revByMonth = await Order.findAll({
            attributes: [
                [db.sequelize.fn('strftime', '%m', db.sequelize.col('createdAt')), 'month'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue']
            ],
            where: { createdAt: { [Op.gte]: startOfYear }, status: { [Op.ne]: 'Cancelled' } },
            group: [db.sequelize.fn('strftime', '%m', db.sequelize.col('createdAt'))],
            raw: true
        });

        const expByMonth = await Expense.findAll({
            attributes: [
                [db.sequelize.fn('strftime', '%m', db.sequelize.col('date')), 'month'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'expense']
            ],
            where: { date: { [Op.gte]: startOfYear } },
            group: [db.sequelize.fn('strftime', '%m', db.sequelize.col('date'))],
            raw: true
        });

        res.json({
            todaySales,
            weeklySales: weeklySalesData, // Array of {day, amount}
            monthlySales: monthlySalesData, // Array of {day, amount}
            yearlySales: yearlySalesData, // Array of {month, amount}
            expenseDistribution, // Array of {category, total}
            financialOverview: {
                revenue: revByMonth,
                expenses: expByMonth
            }
        });

    } catch (err) {
        console.error("Error fetching chart data:", err);
        res.status(500).json({ message: "Error fetching chart data" });
    }
});

module.exports = router;
