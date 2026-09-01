import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Sala from './sala.js';
import Periodo from './periodo.js';
import Usuario from './usuario.js';

const Tarea = db.define('Tarea', {
    id_tarea: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_sala: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_periodo: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_profesor: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    consigna: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    fecha_limite: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('ACTIVA', 'CERRADA'),
        allowNull: false,
        defaultValue: 'ACTIVA'
    }
}, {
    tableName: 'tarea',
    timestamps: true
});

Tarea.belongsTo(Sala, { foreignKey: 'id_sala' });
Tarea.belongsTo(Periodo, { foreignKey: 'id_periodo' });
Tarea.belongsTo(Usuario, { foreignKey: 'id_profesor', as: 'profesor' });

export default Tarea;