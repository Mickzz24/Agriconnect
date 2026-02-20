'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // define association here
        }
    }
    User.init({
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'staff', // owner, staff, customer, deliverer
            allowNull: false
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Active'
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: true, // Auto-approve owners/staff for now, or false for deliverers
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};
