import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Empresa from './empresa.js';
import Ciudad from './ciudad.js';

const ClienteProveedor = db.define('ClienteProveedor', {
    id_clienteproveedor: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_ciudad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('CLIENTE', 'PROVEEDOR'),
        allowNull: false
    },
    tipo_documento: {
        type: DataTypes.ENUM('RUC', 'CI', 'PASAPORTE', 'DNI', 'RIF', 'NO_RESIDENTE'),
        allowNull: false
    },
    tipo_contribuyente: {
        type: DataTypes.ENUM('PERSONA_FISICA', 'PERSONA_JURIDICA', 'NO_CONTRIBUYENTE', 'JURIDICA_ESTADO'),
        allowNull: false
    },
    razon_social: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    numero_identificacion: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    correo: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'cliente_proveedor',
    timestamps: true
});

ClienteProveedor.belongsTo(Empresa, { foreignKey: 'id_empresa' });
ClienteProveedor.belongsTo(Ciudad, { foreignKey: 'id_ciudad' });

export default ClienteProveedor;