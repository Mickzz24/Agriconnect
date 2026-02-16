'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Inventory extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    Inventory.init({
        item_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        unit_price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        unit: {
            type: DataTypes.STRING,
            defaultValue: 'kg'
        },
        cost_price: {
            type: DataTypes.FLOAT,
            defaultValue: 0.0
        },
        threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        expiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Inventory',
    });
    return Inventory;
};
