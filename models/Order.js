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
            type: DataTypes.ENUM('Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'),
            defaultValue: 'Pending'
        },
        total_amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.0
        },
        order_type: {
            type: DataTypes.ENUM('Online', 'Offline'),
            defaultValue: 'Offline'
        }
    }, {
        sequelize,
        modelName: 'Order',
    });
    return Order;
};
