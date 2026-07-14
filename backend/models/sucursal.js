import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Empresa from './empresa.js';

const Sucursal = db.define('Sucursal', {
    id_sucursal: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    responsable: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'sucursal',
    timestamps: true,
    updatedAt: 'updatedat'
});

Sucursal.belongsTo(Empresa, { foreignKey: 'id_empresa' });

export default Sucursal;
