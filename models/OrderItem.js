'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.Order, { foreignKey: 'orderId' });
            OrderItem.belongsTo(models.Inventory, { foreignKey: 'inventoryId' });
        }
    }
    OrderItem.init({
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Orders',
                key: 'id'
            }
        },
        inventoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Inventories',
                key: 'id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        price: { // Store price at time of order
            type: DataTypes.FLOAT,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'OrderItem',
    });
    return OrderItem;
};
