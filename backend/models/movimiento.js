import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Usuario from './usuario.js';
import Empresa from './empresa.js';

const Movimiento = db.define('Movimiento', {
    id_movimiento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    referencia_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'movimiento',
    timestamps: true,
    updatedAt: false // solo interesa cuándo se creó, no se edita nunca
});

Movimiento.belongsTo(Usuario, { foreignKey: 'id_usuario' });
Movimiento.belongsTo(Empresa, { foreignKey: 'id_empresa' });

export default Movimiento;