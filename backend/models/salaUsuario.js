import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Usuario from './usuario.js';
import Sala from './sala.js';

const SalaUsuario = db.define('SalaUsuario', {
    idsala_usuario: {
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
    id_alumno: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('PROFESOR', 'ALUMNO'),
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    baja: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'sala_usuario',
    timestamps: true
});

SalaUsuario.belongsTo(Sala, { foreignKey: 'id_sala' });
SalaUsuario.belongsTo(Usuario, { foreignKey: 'id_profesor', as: 'Profesor' });
SalaUsuario.belongsTo(Usuario, { foreignKey: 'id_alumno', as: 'Alumno' });

export default SalaUsuario;