const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_PATH = path.join(__dirname, '..', 'ML', 'AgricultureData.csv');

/**
 * Calculates KPIs and chart data from AgricultureData.csv
 */
async function getCsvStats() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(CSV_PATH)) {
            console.warn(`CSV dataset not found at ${CSV_PATH}`);
            return resolve(null);
        }

        const stats = {
            latestDate: null,
            totalRevenue: 0,
            totalProfit: 0,
            totalExpenses: 0,
            totalOrders: 0,
            latestDayRevenue: 0,
            latestDayOrders: 0,
            latestMonthRevenue: 0,
            latestMonthOrders: 0,
            charts: {
                todaySales: [],
                weeklySales: [],
                monthlySales: [],
                yearlySales: [],
                expenseDistribution: []
            }
        };

        const rows = [];
        const todayProductMap = {};
        const yearlySalesMap = {}; // { 'YYYY': totalRevenue }
        const monthlySalesMap = {}; // { 'YYYY-MM': totalRevenue }
        const dailyRevenueMap = {}; // { 'YYYY-MM-DD': totalRevenue }

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                const price = parseFloat(row.price_per_kg);
                const sold = parseFloat(row.units_sold_kg);
                const date = row.sale_date;

                if (!isNaN(price) && !isNaN(sold)) {
                    const revenue = price * sold;
                    stats.totalRevenue += revenue;
                    stats.totalOrders++;
                    rows.push({
                        revenue,
                        date,
                        productName: row.product_name,
                        unitsShipped: parseFloat(row.units_shipped_kg) || 0,
                        unitsOnHand: parseFloat(row.units_on_hand_kg) || 0
                    });
                }
            })
            .on('end', () => {
                if (rows.length === 0) return resolve(stats);

                // Sort rows by date descending
                rows.sort((a, b) => new Date(b.date) - new Date(a.date));

                const latestDate = rows[0].date;
                stats.latestDate = latestDate;
                const latestMonthStr = latestDate.substring(0, 7); // YYYY-MM

                rows.forEach(r => {
                    // KPI Aggregations
                    if (r.date === latestDate) {
                        stats.latestDayRevenue += r.revenue;
                        stats.latestDayOrders++;
                        todayProductMap[r.productName] = (todayProductMap[r.productName] || 0) + 1;
                    }
                    if (r.date.startsWith(latestMonthStr)) {
                        stats.latestMonthRevenue += r.revenue;
                        stats.latestMonthOrders++;
                    }

                    // Monthly Aggregation (YYYY-MM)
                    const monthStr = r.date.substring(0, 7);
                    monthlySalesMap[monthStr] = (monthlySalesMap[monthStr] || 0) + r.revenue;

                    // Yearly Aggregation (YYYY)
                    const yearStr = r.date.substring(0, 4);
                    yearlySalesMap[yearStr] = (yearlySalesMap[yearStr] || 0) + r.revenue;

                    // Daily Map for Weekly/Detailed Trend
                    dailyRevenueMap[r.date] = (dailyRevenueMap[r.date] || 0) + r.revenue;
                });

                // Formatting Chart Data
                stats.charts.todaySales = Object.entries(todayProductMap).map(([itemName, totalQty]) => ({ itemName, totalQty }));

                const sortedDates = Object.keys(dailyRevenueMap).sort();

                // Weekly: Last 7 active days
                stats.charts.weeklySales = sortedDates.slice(-7).map(d => ({ day: d, amount: dailyRevenueMap[d] }));

                // Monthly: Full History (YYYY-MM)
                stats.charts.monthlySales = Object.entries(monthlySalesMap)
                    .map(([day, amount]) => ({ day, amount }))
                    .sort((a, b) => a.day.localeCompare(b.day));

                // Yearly: Full History (YYYY)
                stats.charts.yearlySales = Object.entries(yearlySalesMap)
                    .map(([year, amount]) => ({ year, amount }))
                    .sort((a, b) => a.year.localeCompare(b.year));

                // Profit & Expenses (Estimated for CSV)
                stats.totalProfit = stats.totalRevenue * 0.20;
                stats.totalExpenses = stats.totalRevenue * 0.80;
                stats.totalUnitsShipped = rows.reduce((sum, r) => sum + (parseFloat(r.unitsShipped) || 0), 0);
                stats.totalUnitsOnHand = rows.reduce((sum, r) => sum + (parseFloat(r.unitsOnHand) || 0), 0);

                stats.charts.expenseDistribution = [
                    { category: 'Logistics', total: stats.totalExpenses * 0.40 },
                    { category: 'Labor', total: stats.totalExpenses * 0.25 },
                    { category: 'Storage', total: stats.totalExpenses * 0.20 },
                    { category: 'Marketing', total: stats.totalExpenses * 0.15 }
                ];

                resolve(stats);
            })
            .on('error', (err) => {
                console.error("Error reading CSV:", err);
                resolve(null);
            });
    });
}

module.exports = { getCsvStats };
