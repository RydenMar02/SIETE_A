import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';

const Ciudad = db.define('Ciudad', {
    id_ciudad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'ciudad',
    timestamps: true
});

export default Ciudad;