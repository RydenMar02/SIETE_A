import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Sala from './sala.js';
import Usuario from './usuario.js';

const Actividad = db.define('Actividad', {
    id_actividad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_sala: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_profesor: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    proceso: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1 // 1 = visible, 0 = archivada (soft delete, mismo patrón que el resto del sistema)
    }
}, {
    tableName: 'actividad',
    timestamps: true
});

Actividad.belongsTo(Sala, { foreignKey: 'id_sala' });
Actividad.belongsTo(Usuario, { foreignKey: 'id_profesor', as: 'profesor' });

export default Actividad;