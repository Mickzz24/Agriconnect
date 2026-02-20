const cron = require('node-cron');
const { User } = require('../models');
const { generateReportData } = require('./reportGenerator');
const { sendReportEmail } = require('./emailService');

const initScheduler = () => {
    console.log("Initializing Task Scheduler...");

    // 1. Daily Report for OWNERS at 9:00 AM
    // Cron: 0 9 * * *
    cron.schedule('0 9 * * *', async () => {
        console.log("Running Daily Report Job for Owners...");
        try {
            const owners = await User.findAll({ where: { role: 'owner' } });
            if (!owners.length) return;

            const today = new Date();
            const { finalOrders, total, attachment, reportTitle } = await generateReportData('Daily', today);

            if (finalOrders.length === 0) {
                console.log("No data for Daily Report, skipping.");
                return;
            }

            const emailHtml = `
                <h2>AgriConnect Daily Summary</h2>
                <p>Here is your automated daily report.</p>
                <ul>
                    <li><strong>Total Orders:</strong> ${finalOrders.length}</li>
                    <li><strong>Revenue:</strong> $${total.toFixed(2)}</li>
                </ul>
            `;

            for (const owner of owners) {
                if (owner.email) {
                    await sendReportEmail(owner.email, `Automated: ${reportTitle}`, emailHtml, [attachment]);
                }
            }
            console.log(`Daily Report sent to ${owners.length} owners.`);
        } catch (err) {
            console.error("Error in Daily Job:", err);
        }
    });

    // 2. Weekly Report for STAFF at 9:00 AM on Monday
    // Cron: 0 9 * * 1
    cron.schedule('0 9 * * 1', async () => {
        console.log("Running Weekly Report Job for Staff...");
        try {
            const staff = await User.findAll({ where: { role: 'staff' } });
            if (!staff.length) return;

            const today = new Date();
            const { finalOrders, total, attachment, reportTitle } = await generateReportData('Weekly', today);

            const emailHtml = `
                <h2>AgriConnect Weekly Summary</h2>
                <p>Here is the weekly performance report.</p>
                <ul>
                    <li><strong>Total Orders:</strong> ${finalOrders.length}</li>
                    <li><strong>Revenue:</strong> $${total.toFixed(2)}</li>
                </ul>
            `;

            for (const s of staff) {
                if (s.email) {
                    await sendReportEmail(s.email, `Automated: ${reportTitle}`, emailHtml, [attachment]);
                }
            }
            console.log(`Weekly Report sent to ${staff.length} staff members.`);
        } catch (err) {
            console.error("Error in Weekly Job:", err);
        }
    });
};

module.exports = { initScheduler };
