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

        // --- DEMO MODE: Force "Today" to be the last date in CSV ---
        // This ensures the dashboard always looks alive with data, even if the dataset is old.
        let effectiveTodayStr = new Date().toISOString().split('T')[0];
        let isDemoMode = true; // Enable auto-detection
        // -----------------------------------------------------------

        const rows = [];
        const todayProductMap = {};
        const yearlySalesMap = {}; // { 'YYYY': totalRevenue }
        const monthlySalesMap = {}; // { 'YYYY-MM': totalRevenue }
        const dailyRevenueMap = {}; // { 'YYYY-MM-DD': totalRevenue }

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                // SCALE DOWN FACTOR: 1000 (To match small business scale)
                const price = parseFloat(row.price_per_kg);
                const sold = parseFloat(row.units_sold_kg);
                const date = row.sale_date;

                if (!isNaN(price) && !isNaN(sold)) {
                    // Reduce revenue magnitude
                    const revenue = (price * sold) / 1000;

                    stats.totalRevenue += revenue;
                    stats.totalOrders++;
                    rows.push({
                        revenue,
                        date,
                        productName: row.product_name,
                        unitsShipped: (parseFloat(row.units_shipped_kg) || 0) / 1000,
                        unitsOnHand: (parseFloat(row.units_on_hand_kg) || 0) / 1000
                    });
                }
            })
            .on('end', () => {
                if (rows.length === 0) return resolve(stats);

                rows.sort((a, b) => new Date(b.date) - new Date(a.date));

                // --- DEMO MODE: Date Shifting ---
                if (isDemoMode && rows.length > 0) {
                    const latestRowDate = new Date(rows[0].date);
                    const now = new Date();
                    const timeDiff = now - latestRowDate;

                    // Only shift if data is old (> 30 days)
                    if (timeDiff > 30 * 24 * 60 * 60 * 1000) {
                        console.log(`[CSV Stats] Shifting data by approx ${Math.floor(timeDiff / (1000 * 60 * 60 * 24))} days`);
                        rows.forEach(row => {
                            const originalDate = new Date(row.date);
                            const newDate = new Date(originalDate.getTime() + timeDiff);

                            // Use local date components to match routes/reports.js logic
                            const y = newDate.getFullYear();
                            const m = String(newDate.getMonth() + 1).padStart(2, '0');
                            const d = String(newDate.getDate()).padStart(2, '0');
                            row.date = `${y}-${m}-${d}`;
                        });
                        // Re-sort just in case, though pushing same constant shouldn't change order
                        effectiveTodayStr = rows[0].date;
                    } else {
                        effectiveTodayStr = rows[0].date;
                    }
                } else if (rows.length > 0) {
                    effectiveTodayStr = rows[0].date;
                }

                stats.latestDate = effectiveTodayStr;
                const latestMonthStr = effectiveTodayStr.substring(0, 7); // YYYY-MM

                rows.forEach(r => {
                    // KPI Aggregations
                    if (r.date === effectiveTodayStr) {
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
