import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import AsientoCabecera from './asientoCabecera.js';
import EmpresaCuenta from './empresaCuenta.js';

const AsientoDetalle = db.define('AsientoDetalle', {
    id_detalle: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_asiento: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_empresacuenta: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    debe: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    haber: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
    }
}, {
    tableName: 'asiento_detalle',
    timestamps: true
});

AsientoDetalle.belongsTo(AsientoCabecera, {
    foreignKey: 'id_asiento',
    as: 'asientoCabecera',
    onDelete: 'CASCADE'
});

AsientoDetalle.belongsTo(EmpresaCuenta, {
    foreignKey: 'id_empresacuenta',
    as: 'empresaCuenta'
});

AsientoCabecera.hasMany(AsientoDetalle, {
    foreignKey: 'id_asiento',
    as: 'asientoDetalles'
});

EmpresaCuenta.hasMany(AsientoDetalle, {
    foreignKey: 'id_empresacuenta',
    as: 'asientoDetalles'
});

export default AsientoDetalle;