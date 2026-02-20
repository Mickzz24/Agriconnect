const path = require('path');

// Clear cache just in case
delete require.cache[require.resolve('./utils/csv_stats')];

const csvStatsPath = require.resolve('./utils/csv_stats');
console.log(`Loading csvStats from: ${csvStatsPath}`);

const csvStats = require(csvStatsPath);

console.log("Running CSV Stats Verification...");

csvStats.getCsvStats().then(stats => {
    console.log("--- Stats Result ---");
    console.log("Latest Date:", stats.latestDate);
    console.log("Total Revenue:", stats.totalRevenue);
    console.log("Total Profit:", stats.totalProfit);

    // Check if dates are recent (2026)
    const year = new Date(stats.latestDate).getFullYear();
    console.log("Detected Year:", year);

    if (year >= 2024 && stats.totalRevenue > 0) {
        console.log("✅ VERIFICATION SUCCESS: Demo Mode is working.");
    } else {
        console.error("❌ VERIFICATION FAILED: Data seems old or empty.");
        process.exit(1);
    }
}).catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
