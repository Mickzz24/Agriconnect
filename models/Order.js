'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Order extends Model {
        static associate(models) {
            Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
            Order.belongsTo(models.User, { foreignKey: 'userId' });
        }
    }
    Order.init({
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true // For now, allow null for existing/offline orders
        },
        customer_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Pending', 'Paid', 'Approved', 'Packed', 'Shipped', 'Delivered', 'Cancelled'),
            defaultValue: 'Pending'
        },
        payment_method: {
            type: DataTypes.ENUM('UPI', 'COD'),
            allowNull: true
        },
        total_amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.0
        },
        order_type: {
            type: DataTypes.ENUM('Online', 'Offline'),
            defaultValue: 'Offline'
        },
        delivererId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        deliveryAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        contactNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        deliveryTime: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};
