import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';

const Cuenta = db.define('Cuenta', {
    id_cuenta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    nombre_alternativo: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    codigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    asentable: {
        type: DataTypes.ENUM('SI', 'NO'),
        allowNull: false
    },
    naturaleza: {
        type: DataTypes.ENUM('ACREEDORA', 'DEUDORA'),
        allowNull: true
    },
    moneda: {
        type: DataTypes.ENUM('LOCAL', 'EXTRANJERA'),
        allowNull: true
    },
    id_padre: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nivel: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    pordefecto: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'cuenta',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

// Relacion reflexiva padre - hija
Cuenta.belongsTo(Cuenta, {
    foreignKey: 'id_padre',
    as: 'cuentaPadre'
});

Cuenta.hasMany(Cuenta, {
    foreignKey: 'id_padre',
    as: 'cuentasHijas'
});

export default Cuenta;