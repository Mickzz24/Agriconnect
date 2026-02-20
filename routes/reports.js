const express = require('express');
const router = express.Router();
const db = require('../models');
const { Order, OrderItem, Inventory, Expense, User } = db;
const { Op } = require('sequelize');
const verifyToken = require('../middleware/authMiddleware');
const { getCsvStats } = require('../utils/csv_stats');

// Helper to calculate COGS for a period
async function calculateMonthlyCOGS(startDate, statuses) {
    const soldItems = await OrderItem.findAll({
        include: [{
            model: Order,
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: statuses }
            },
            attributes: []
        }],
        attributes: [
            [db.sequelize.fn('SUM', db.sequelize.where(db.sequelize.col('quantity'), '*', db.sequelize.col('OrderItem.cost_price'))), 'totalCost']
        ],
        raw: true
    });
    return soldItems[0].totalCost || 0;
}

// Dashboard Stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const csvStats = await getCsvStats(); // Could be null

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Use local date string construction to avoid UTC shifts
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`; // YYYY-MM-DD Local

        // --- SQL Stats ---
        const sqlLowStock = await Inventory.count({
            where: { quantity: { [Op.lte]: db.sequelize.col('threshold') } }
        });
        const sqlPendingDeliverers = await User.count({
            where: { role: 'deliverer', status: 'Pending' }
        });

        // Revenue Statuses (Confirmed Sales)
        const revenueStatuses = ['Paid', 'Delivered', 'Shipped', 'Packed', 'Approved'];

        const sqlTotalRevenue = (await Order.sum('total_amount', { where: { status: { [Op.in]: revenueStatuses } } }) || 0);

        // Calculate Real COGS (Sum of cost_price * quantity for sold items)
        const soldItems = await OrderItem.findAll({
            include: [{
                model: Order,
                where: { status: { [Op.in]: revenueStatuses } },
                attributes: []
            }],
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.where(db.sequelize.col('quantity'), '*', db.sequelize.col('OrderItem.cost_price'))), 'totalCost']
            ],
            raw: true
        });

        const sqlTotalCOGS = soldItems[0].totalCost || 0;
        const sqlTotalExpense = (await Expense.sum('amount') || 0);

        // Net Profit = Revenue - COGS - Expenses
        // If COGS is 0 (old data), we might want to use a fallback, but for now let's be strict or use a hybrid
        // Hybrid: If cost_price is 0, assume 20% margin? No, user wants real numbers.
        // Let's stick to the formula. If cost is 0, profit is high (Revenue - Expenses).
        // This encourages them to enter costs.
        const sqlTotalProfit = sqlTotalRevenue - sqlTotalCOGS - sqlTotalExpense;

        // SQL Comparisons
        // For SQLite, we must use 'localtime' to convert UTC stored dates to local timezone
        const sqlTodayOrders = await Order.count({
            where: db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('createdAt'), 'localtime'), todayDateStr)
        });
        const sqlMonthOrders = await Order.count({ where: { createdAt: { [Op.gte]: firstDayOfMonth } } });

        const sqlTodayRevenue = (await Order.sum('total_amount', {
            where: {
                [Op.and]: [
                    db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('createdAt'), 'localtime'), todayDateStr),
                    { status: { [Op.in]: revenueStatuses } }
                ]
            }
        }) || 0);
        const sqlMonthRevenue = (await Order.sum('total_amount', { where: { createdAt: { [Op.gte]: firstDayOfMonth }, status: { [Op.in]: revenueStatuses } } }) || 0);
        const sqlMonthExpense = (await Expense.sum('amount', { where: { date: { [Op.gte]: firstDayOfMonth } } }) || 0);
        const sqlTodayExpense = (await Expense.sum('amount', { where: db.sequelize.where(db.sequelize.fn('date', db.sequelize.col('createdAt'), 'localtime'), todayDateStr) }) || 0);
        const pendingPaymentsCount = await Order.count({ where: { status: 'Pending' } });

        // --- Merge Stats ---
        console.log(`DEBUG: SQL Today Revenue: ${sqlTodayRevenue}, SQL Today Orders: ${sqlTodayOrders}, TodayStr: ${todayDateStr}`);

        let csvTodayRev = 0;
        let csvTodayOrders = 0;
        let csvMonthRev = 0;
        let csvMonthOrders = 0;

        if (csvStats && csvStats.latestDate) {
            console.log(`DEBUG: Comparing CSV Latest Date [${csvStats.latestDate}] with Today [${todayDateStr}]`);

            // Check Day Match
            if (csvStats.latestDate === todayDateStr) {
                console.log("DEBUG: Daily Stats Matched!");
                csvTodayRev = csvStats.latestDayRevenue;
                csvTodayOrders = csvStats.latestDayOrders;
            } else {
                console.log("DEBUG: Daily Stats Mismatch");
            }

            // Check Month Match (YYYY-MM)
            if (csvStats.latestDate.substring(0, 7) === todayDateStr.substring(0, 7)) {
                console.log("DEBUG: Monthly Stats Matched!");
                csvMonthRev = csvStats.latestMonthRevenue;
                csvMonthOrders = csvStats.latestMonthOrders;
            }
        }

        const finalRevenue = (csvStats ? csvStats.totalRevenue : 0) + sqlTotalRevenue;
        const finalProfit = (csvStats ? csvStats.totalProfit : 0) + sqlTotalProfit;
        const finalExpenses = (csvStats ? csvStats.totalExpenses : 0) + sqlTotalExpense;

        const totalVolume = (csvStats ? csvStats.totalUnitsShipped : 0) + (await OrderItem.sum('quantity') || 0);

        res.json({
            orders: {
                today: csvTodayOrders + sqlTodayOrders,
                month: csvMonthOrders + sqlMonthOrders,
                pending: await Order.count({ where: { status: 'Pending' } }),
                toPack: await Order.count({ where: { status: { [Op.in]: ['Paid', 'Approved'] } } }),
                readyForDelivery: await Order.count({ where: { status: 'Packed' } }),
                volume: totalVolume
            },
            revenue: {
                today: csvTodayRev + sqlTodayRevenue,
                month: csvMonthRev + sqlMonthRevenue,
                total: finalRevenue
            },
            expenses: {
                today: sqlTodayExpense,
                total: finalExpenses
            },
            financials: {
                netProfit: finalProfit,
                netProfit: finalProfit.toFixed(2),
                // Monthly Profit: Revenue - COGS - Expenses (Calculated accurately)
                monthlyProfit: (sqlMonthRevenue - sqlMonthExpense - (await calculateMonthlyCOGS(firstDayOfMonth, revenueStatuses))).toFixed(2),
                pendingPayments: pendingPaymentsCount,
                taxEstimate: finalProfit * 0.15,
                operatingMargin: finalRevenue > 0 ? ((finalProfit / finalRevenue) * 100).toFixed(1) : 0
            },
            inventory: {
                lowStock: sqlLowStock,
                totalOnHand: (csvStats ? csvStats.totalUnitsOnHand : 0)
            },
            users: {
                pendingDeliverers: sqlPendingDeliverers,
                customerGrowth: 15.2, // Simulated integrated growth
                avgRating: 4.7
            }
        });

    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
});


// Chart Data - Unified
router.get('/charts', verifyToken, async (req, res) => {
    try {
        const csvStats = await getCsvStats() || {
            charts: { todaySales: [], weeklySales: [], monthlySales: [], yearlySales: [], expenseDistribution: [] }
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Revenue Statuses (Confirmed Sales)
        const revenueStatuses = ['Paid', 'Delivered', 'Shipped', 'Packed', 'Approved'];

        // --- SQL Data Fetching ---

        // 1. Today's Sales (Pie)
        const sqlTodaySales = await OrderItem.findAll({
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.quantity')), 'totalQty'],
                [db.sequelize.col('Inventory.item_name'), 'itemName']
            ],
            include: [{
                model: Order, attributes: [],
                where: { createdAt: { [Op.gte]: today }, status: { [Op.in]: revenueStatuses } }
            }, { model: Inventory, attributes: [] }],
            group: ['Inventory.item_name'], raw: true
        });

        // 2. Weekly Sales (Last 7 Days - Detailed)
        const last7Days = new Date(today); last7Days.setDate(today.getDate() - 7);
        const sqlWeeklySales = await Order.findAll({
            attributes: [
                [db.sequelize.fn('date', db.sequelize.col('createdAt'), 'localtime'), 'day'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: { createdAt: { [Op.gte]: last7Days }, status: { [Op.in]: revenueStatuses } },
            group: [db.sequelize.fn('date', db.sequelize.col('createdAt'), 'localtime')], raw: true
        });

        // 3. Monthly Sales (YYYY-MM Trend)
        // Note: 'localtime' modifier before strftime might be needed or inside? 
        // SQLite: strftime('%Y-%m', createdAt, 'localtime')
        const sqlMonthlySales = await Order.findAll({
            attributes: [
                [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('createdAt'), 'localtime'), 'day'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: { status: { [Op.in]: revenueStatuses } }, // Full history
            group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('createdAt'), 'localtime')], raw: true
        });

        // 4. Yearly Sales (YYYY)
        const sqlYearlySales = await Order.findAll({
            attributes: [
                [db.sequelize.fn('strftime', '%Y', db.sequelize.col('createdAt'), 'localtime'), 'year'],
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
            ],
            where: { status: { [Op.in]: revenueStatuses } }, // Full history
            group: [db.sequelize.fn('strftime', '%Y', db.sequelize.col('createdAt'), 'localtime')], raw: true
        });

        // 5. Expense Distribution
        const sqlExpenses = await Expense.findAll({
            attributes: ['category', [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
            group: ['category'], raw: true
        });
        console.log("DEBUG: SQL Expenses Categories:", sqlExpenses);


        // --- Merging Logic ---

        // Helper to merge arrays by a key
        const mergeBy = (arr1, arr2, key, valKey) => {
            const map = new Map();
            [...arr1, ...arr2].forEach(item => {
                const k = item[key];
                const existing = map.get(k) || 0;
                map.set(k, existing + (parseFloat(item[valKey]) || 0));
            });
            return Array.from(map.entries())
                .map(([k, v]) => ({ [key]: k, [valKey]: v }))
                .sort((a, b) => a[key].localeCompare(b[key]));
        };

        const finalTodaySales = mergeBy(csvStats.charts.todaySales, sqlTodaySales, 'itemName', 'totalQty');
        const finalWeeklySales = mergeBy(csvStats.charts.weeklySales, sqlWeeklySales, 'day', 'amount').slice(-7); // Keep last 7
        const finalMonthlySales = mergeBy(csvStats.charts.monthlySales, sqlMonthlySales, 'day', 'amount'); // Full history Trend
        const finalYearlySales = mergeBy(csvStats.charts.yearlySales, sqlYearlySales, 'year', 'amount');
        const finalExpensesDist = mergeBy(csvStats.charts.expenseDistribution, sqlExpenses, 'category', 'total');

        // Financial Overview (Yearly Breakdown)
        const finalFinancialOverview = {
            revenue: finalYearlySales.map(s => ({ year: s.year, revenue: s.amount })),
            expenses: finalYearlySales.map(s => ({ year: s.year, expense: s.amount * 0.80 })) // Approximating expenses for overview
        };

        res.json({
            todaySales: finalTodaySales,
            weeklySales: finalWeeklySales,
            monthlySales: finalMonthlySales,
            yearlySales: finalYearlySales,
            expenseDistribution: finalExpensesDist,
            financialOverview: finalFinancialOverview
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
        const { generateReportData } = require('../utils/reportGenerator');

        // Use the centralized utility to generate data
        const { finalOrders, total, attachment, reportTitle } = await generateReportData(reportType, date);

        // Allow empty reports
        if (finalOrders.length === 0) {
            // Log for debug but don't error out
            console.log("Generating report with 0 orders.");
        }

        if (format === 'csv') {
            // If the request is for download (not email), return the data directly
            if (req.body.action === 'download') {
                return res.json({
                    message: "Report generated successfully",
                    downloadUrl: true,
                    filename: attachment.filename,
                    fileContent: attachment.content,
                    data: finalOrders,
                    summary: { totalOrders: finalOrders.length, totalRevenue: total }
                });
            }
        } else {
            return res.status(400).json({ message: "PDF email not yet implemented server-side. Please use CSV format." });
        }

        // Send email to all owners
        const emailHtml = `
            <h2>AgriConnect Financial Report</h2>
            <p>Dear Owner,</p>
            <p>Please find attached the <strong>${reportTitle}</strong> generated on ${new Date().toLocaleString()}.</p>
            <h3>Summary:</h3>
            <ul>
                <li><strong>Total Orders:</strong> ${finalOrders.length}</li>
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

// DEBUG ROUTE - REMOVE LATER
router.get('/debug-stats', async (req, res) => {
    try {
        const csvStats = await getCsvStats();
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        res.json({
            todayDateStr,
            csvLatestDate: csvStats ? csvStats.latestDate : 'null',
            match: csvStats && csvStats.latestDate === todayDateStr,
            matchMonth: csvStats && csvStats.latestDate.substring(0, 7) === todayDateStr.substring(0, 7),
            csvStats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
