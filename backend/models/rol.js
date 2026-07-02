import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';

const Rol = db.define('Rol', {
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    rol: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
    tableName: 'rol',
    timestamps: true
});

export default Rol;