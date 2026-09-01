import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Tarea from './tarea.js';
import Empresa from './empresa.js';

const Entrega = db.define('Entrega', {
    id_entrega: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_tarea: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('PENDIENTE', 'ENTREGADA', 'CORREGIDA'),
        allowNull: false,
        defaultValue: 'PENDIENTE'
    },
    fecha_entrega: {
        type: DataTypes.DATE,
        allowNull: true
    },
    comentario_alumno: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'entrega',
    timestamps: true,
    indexes: [{
        unique: true,
        fields: ['id_tarea', 'id_empresa'],
        name: 'uq_entrega_tarea_empresa'
    }]
});

Entrega.belongsTo(Tarea, { foreignKey: 'id_tarea' });
Tarea.hasMany(Entrega, { foreignKey: 'id_tarea' });

Entrega.belongsTo(Empresa, { foreignKey: 'id_empresa' });
Empresa.hasMany(Entrega, { foreignKey: 'id_empresa' });

export default Entrega;