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

        // 6. Monthly Performance Grouped by Weeks (last 28 days)
        const monthlyWeeklyStats = [];
        const todayForWeekly = new Date(today);
        todayForWeekly.setHours(23, 59, 59, 999);

        for (let i = 0; i < 4; i++) {
            const end = new Date(todayForWeekly);
            end.setDate(todayForWeekly.getDate() - (i * 7));
            const start = new Date(end);
            start.setDate(end.getDate() - 6);
            start.setHours(0, 0, 0, 0);

            const rev = await Order.sum('total_amount', {
                where: {
                    createdAt: { [Op.between]: [start.toISOString(), end.toISOString()] },
                    status: { [Op.ne]: 'Cancelled' }
                }
            }) || 0;

            const exp = await Expense.sum('amount', {
                where: {
                    date: { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] }
                }
            }) || 0;

            monthlyWeeklyStats.push({
                week: `Week ${4 - i}`,
                revenue: parseFloat(rev),
                expenses: parseFloat(exp),
                profit: parseFloat(rev) - parseFloat(exp)
            });
        }
        monthlyWeeklyStats.reverse();

        res.json({
            todaySales,
            weeklySales: weeklySalesData,
            monthlySales: monthlySalesData,
            yearlySales: yearlySalesData,
            expenseDistribution,
            monthlyWeeklyStats,
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

// Email Report Endpoint
router.post('/email-report', verifyToken, async (req, res) => {
    try {
        const { reportType, format, selectedDate } = req.body;

        if (!selectedDate) {
            return res.status(400).json({ message: "Date is required" });
        }

        const { sendReportEmail } = require('../utils/emailService');

        // Find all owners
        const owners = await User.findAll({ where: { role: 'owner' } });
        if (!owners || owners.length === 0) {
            return res.status(404).json({ message: "No owners found to send report" });
        }

        const date = new Date(selectedDate);
        let start, end, reportTitle;

        // Determine date range
        if (reportType === 'Daily') {
            start = new Date(date);
            end = new Date(date);
            reportTitle = `Daily Sales Report (${start.toLocaleDateString()})`;
        } else if (reportType === 'Weekly') {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(date.setDate(diff));
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            reportTitle = `Weekly Sales Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
        } else if (reportType === 'Monthly' || reportType === 'PL' || reportType === 'Expense') {
            start = new Date(date.getFullYear(), date.getMonth(), 1);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const monthName = start.toLocaleString('default', { month: 'long' });
            reportTitle = `${reportType === 'PL' ? 'Profit & Loss' : reportType === 'Expense' ? 'Expense' : 'Monthly Sales'} Report - ${monthName} ${start.getFullYear()}`;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Fetch orders
        const orders = await Order.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
            }
        });

        if (orders.length === 0) {
            return res.status(404).json({ message: "No data found for the selected period" });
        }

        let attachment;
        const total = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

        if (format === 'csv') {
            let csv = 'ID,Customer,Amount,Status,Date\n';
            orders.forEach(o => csv += `${o.id},${o.customer_name},${o.total_amount},${o.status},${new Date(o.createdAt).toLocaleDateString()}\n`);
            csv += `\nTotal Revenue,$${total.toFixed(2)}`;

            attachment = {
                filename: `${reportType}_Report_${selectedDate}.csv`,
                content: csv
            };
        } else {
            // Generate PDF (simplified - in production use jsPDF on server)
            return res.status(400).json({ message: "PDF email not yet implemented server-side. Please use CSV format." });
        }

        // Send email to all owners
        const emailHtml = `
            <h2>AgriConnect Financial Report</h2>
            <p>Dear Owner,</p>
            <p>Please find attached the <strong>${reportTitle}</strong> generated on ${new Date().toLocaleString()}.</p>
            <h3>Summary:</h3>
            <ul>
                <li><strong>Total Orders:</strong> ${orders.length}</li>
                <li><strong>Total Revenue:</strong> $${total.toFixed(2)}</li>
            </ul>
            <p>Best regards,<br/>AgriConnect System</p>
        `;

        let emailsSent = 0;
        for (const owner of owners) {
            if (owner.email) {
                const sent = await sendReportEmail(
                    owner.email,
                    `AgriConnect: ${reportTitle}`,
                    emailHtml,
                    [attachment]
                );
                if (sent) emailsSent++;
            }
        }

        res.json({
            message: `Report sent successfully to ${emailsSent} owner(s)`,
            emailsSent
        });

    } catch (err) {
        console.error("Error sending report email:", err);
        res.status(500).json({ message: "Error sending report email" });
    }
});

module.exports = router;
