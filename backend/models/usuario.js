import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Rol from './rol.js';

const Usuario = db.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    cedula: {
        type: DataTypes.STRING(8),
        allowNull: false
    },
    correo: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    contra: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    telefono: {
        type: DataTypes.STRING(10),
        allowNull: false
    }
}, {
    tableName: 'usuario',
    timestamps: true
});

Usuario.belongsTo(Rol, {
    foreignKey: 'id_rol'
});

export default Usuario;