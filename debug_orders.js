const db = require('./models');
const { Order } = db;
const { Op } = require('sequelize');

async function debugOrders() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('JS Date (Start of Day):', today.toString());
        console.log('JS Date (ISO):', today.toISOString());

        const orders = await Order.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });

        console.log('\n--- Latest 5 Orders ---');
        orders.forEach(o => {
            console.log(`ID: ${o.id}, Status: ${o.status}, Amount: ${o.total_amount}, CreatedAt: ${o.createdAt} (Type: ${typeof o.createdAt})`);
        });

        const revenueStatuses = ['Paid', 'Delivered', 'Shipped', 'Packed', 'Approved'];

        const count = await Order.count({
            where: {
                createdAt: { [Op.gte]: today },
                status: { [Op.in]: revenueStatuses }
            }
        });

        const sum = await Order.sum('total_amount', {
            where: {
                createdAt: { [Op.gte]: today },
                status: { [Op.in]: revenueStatuses }
            }
        });

        console.log(`\nQuery Result for Today (>= ${today.toISOString()}):`);
        console.log(`Count: ${count}`);
        console.log(`Sum: ${sum}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

debugOrders();
