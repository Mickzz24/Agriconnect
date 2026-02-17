const db = require('./models');
const { Order } = db;
const { Op } = require('sequelize');

async function checkTodayOrders() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('Today (start of day):', today.toISOString());
        console.log('Current time:', new Date().toISOString());

        // Get all orders from today
        const allTodayOrders = await Order.findAll({
            where: { createdAt: { [Op.gte]: today } },
            order: [['createdAt', 'DESC']]
        });

        console.log('\n=== ALL ORDERS FROM TODAY ===');
        allTodayOrders.forEach(o => {
            console.log(`ID: ${o.id}, Status: ${o.status}, Amount: $${o.total_amount}, Created: ${o.createdAt}`);
        });

        // Check delivered orders
        const revenueStatuses = ['Paid', 'Delivered', 'Shipped', 'Packed', 'Approved'];
        const confirmedOrders = await Order.findAll({
            where: {
                createdAt: { [Op.gte]: today },
                status: { [Op.in]: revenueStatuses }
            }
        });

        console.log('\n=== CONFIRMED ORDERS (for revenue) ===');
        confirmedOrders.forEach(o => {
            console.log(`ID: ${o.id}, Status: ${o.status}, Amount: $${o.total_amount}`);
        });

        const sum = await Order.sum('total_amount', {
            where: {
                createdAt: { [Op.gte]: today },
                status: { [Op.in]: revenueStatuses }
            }
        });

        console.log('\n=== REVENUE CALCULATION ===');
        console.log(`Total Revenue (Today): $${sum || 0}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkTodayOrders();
