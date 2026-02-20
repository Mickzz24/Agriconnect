const reports = require('./routes/reports');
const csvStats = require('./utils/csv_stats');
const db = require('./models');

// Mock request/response to run the route handler in isolation
// Or just replicate the logic to see the structure
async function checkStructure() {
    try {
        console.log("Checking API Structure...");
        const stats = await csvStats.getCsvStats();

        // Emulate the route logic from reports.js
        const sqlTotalRevenue = 0; // Simplified
        const sqlTotalExpense = 0;
        const sqlTotalProfit = 0;

        const finalRevenue = (stats ? stats.totalRevenue : 0) + sqlTotalRevenue;
        const finalProfit = (stats ? stats.totalProfit : 0) + sqlTotalProfit;
        const finalExpenses = (stats ? stats.totalExpenses : 0) + sqlTotalExpense;

        const responseStructure = {
            revenue: {
                total: finalRevenue
            },
            expenses: {
                total: finalExpenses
            },
            financials: {
                netProfit: finalProfit
            }
        };

        console.log(JSON.stringify(responseStructure, null, 2));

        if (responseStructure.revenue && responseStructure.revenue.total) {
            console.log("✅ Revenue.total exists");
        } else {
            console.error("❌ Revenue.total MISSING");
        }

        if (responseStructure.expenses && responseStructure.expenses.total) {
            console.log("✅ Expenses.total exists");
        } else {
            console.error("❌ Expenses.total MISSING");
        }

    } catch (e) {
        console.error(e);
    }
}

checkStructure();
