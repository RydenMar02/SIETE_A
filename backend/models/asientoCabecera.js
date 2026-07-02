import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Empresa from './empresa.js';
import Sucursal from './sucursal.js';

const AsientoCabecera = db.define('AsientoCabecera', {
    id_asiento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_sucursal: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo_asiento: {
        type: DataTypes.ENUM('MANUAL', 'COMPRA', 'VENTA', 'AJUSTE'),
        allowNull: false
    },
    numero_asiento: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    total_debe: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total_haber: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    diferencia: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    concepto: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente'
    }
}, {
    tableName: 'asiento_cabecera',
    timestamps: true,
    indexes: [{
        unique: true,
        fields: ['id_empresa', 'numero_asiento'],
        name: 'uq_asiento_empresa_numero'
    }]
});

AsientoCabecera.belongsTo(Empresa, { foreignKey: 'id_empresa', as: 'empresa' });
AsientoCabecera.belongsTo(Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });

export default AsientoCabecera;