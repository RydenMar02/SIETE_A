import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Entrega from './entrega.js';
import Usuario from './usuario.js';

const Calificacion = db.define('Calificacion', {
    id_calificacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_entrega: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    nota: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false
    },
    comentario: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    id_profesor: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'calificacion',
    timestamps: true
});

Calificacion.belongsTo(Entrega, { foreignKey: 'id_entrega' });
Entrega.hasOne(Calificacion, { foreignKey: 'id_entrega' });

Calificacion.belongsTo(Usuario, { foreignKey: 'id_profesor', as: 'profesor' });

export default Calificacion;