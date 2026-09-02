import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Sala from './sala.js';
import Usuario from './usuario.js';

const Mensaje = db.define('Mensaje', {
    id_mensaje: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: { type: DataTypes.INTEGER, allowNull: false },
    id_emisor: { type: DataTypes.INTEGER, allowNull: false },
    id_receptor: { type: DataTypes.INTEGER, allowNull: false },
    contenido: { type: DataTypes.STRING(500), allowNull: false },
    leido: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 }
}, {
    tableName: 'mensaje',
    timestamps: true
});

Mensaje.belongsTo(Sala, { foreignKey: 'id_sala' });
Mensaje.belongsTo(Usuario, { foreignKey: 'id_emisor', as: 'Emisor' });
Mensaje.belongsTo(Usuario, { foreignKey: 'id_receptor', as: 'Receptor' });

export default Mensaje;