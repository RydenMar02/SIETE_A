import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Sala from './sala.js';

const Ejercicio = db.define('Ejercicio', {
    id_ejercicio: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_sala: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('ABIERTO', 'CERRADO'),
        allowNull: false,
        defaultValue: 'ABIERTO'
    }
}, {
    tableName: 'ejercicio',
    timestamps: true
});

Ejercicio.belongsTo(Sala, { foreignKey: 'id_sala' });
Sala.hasMany(Ejercicio, { foreignKey: 'id_sala' });

export default Ejercicio;