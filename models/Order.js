'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {
            Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
        }
    }
    Order.init({
        customer_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'),
            defaultValue: 'Pending'
        },
        total_amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.0
        }
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};
