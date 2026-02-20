const { Op } = require('sequelize');
const { Order } = require('../models');
const { getCsvStats } = require('./csv_stats');

/**
 * Generates report data for a given date range and type.
 * @param {string} reportType - Daily, Weekly, Monthly, etc.
 * @param {Date} date - The reference date.
 * @returns {Promise<Object>} - Contains { finalOrders, total, attachment }
 */
async function generateReportData(reportType, date) {
    let start, end, reportTitle;
    const selectedDate = new Date(date);

    // Determine date range
    if (reportType === 'Daily') {
        start = new Date(selectedDate);
        end = new Date(selectedDate);
        reportTitle = `Daily Sales Report (${start.toLocaleDateString()})`;
    } else if (reportType === 'Weekly') {
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(selectedDate.setDate(diff));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        reportTitle = `Weekly Sales Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
    } else if (reportType === 'Monthly' || reportType === 'PL' || reportType === 'Expense') {
        start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const monthName = start.toLocaleString('default', { month: 'long' });
        reportTitle = `${reportType === 'PL' ? 'Profit & Loss' : reportType === 'Expense' ? 'Expense' : 'Monthly Sales'} Report - ${monthName} ${start.getFullYear()}`;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Fetch orders from SQL
    const sqlOrders = await Order.findAll({
        where: {
            createdAt: { [Op.between]: [start, end] }
        }
    });

    let finalOrders = sqlOrders.map(o => ({
        id: o.id,
        customer: o.customer_name,
        amount: o.total_amount,
        status: o.status,
        date: o.createdAt
    }));

    // --- MERGE CSV DATA FOR REPORTS ---
    if (finalOrders.length === 0) {
        const csvStats = await getCsvStats();
        if (csvStats) {
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            // Daily Fallback
            if (csvStats.latestDate >= startStr && csvStats.latestDate <= endStr) {
                finalOrders.push({
                    id: 'CSV-DAILY-AGG',
                    customer: 'Historical Data (Aggregated)',
                    amount: csvStats.latestDayRevenue,
                    status: 'Completed',
                    date: new Date(csvStats.latestDate)
                });
            } else if (reportType === 'Monthly') {
                // Monthly Fallback
                const monthStr = startStr.substring(0, 7); // YYYY-MM
                const monthData = csvStats.charts.monthlySales.find(m => m.day === monthStr);
                if (monthData) {
                    finalOrders.push({
                        id: 'CSV-MONTHLY-AGG',
                        customer: 'Historical Data (Total)',
                        amount: monthData.amount,
                        status: 'Completed',
                        date: new Date(monthData.day + '-01')
                    });
                }
            }
        }
    }

    const total = finalOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Generate CSV Content
    let csv = 'ID,Customer,Amount,Status,Date\n';
    finalOrders.forEach(o => csv += `${o.id},${o.customer},${o.amount.toFixed(2)},${o.status},${new Date(o.date).toLocaleDateString()}\n`);
    csv += `\nTotal Revenue,$${total.toFixed(2)}`;

    const attachment = {
        filename: `${reportType}_Report_${start.toISOString().split('T')[0]}.csv`,
        content: csv
    };

    return { finalOrders, total, attachment, reportTitle };
}

module.exports = { generateReportData };
