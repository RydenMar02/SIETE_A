import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';
import Periodo from './periodo.js';
import SalaUsuario from './salaUsuario.js';

const Empresa = db.define('Empresa', {
    id_empresa: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_periodo: { type: DataTypes.INTEGER, allowNull: false },
    id_salausuario: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    ruc: { type: DataTypes.STRING(15), allowNull: false },
    sigla: { type: DataTypes.STRING(20), allowNull: false },
    estado: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, {
    tableName: 'empresa',
    timestamps: true
});

Empresa.belongsTo(Periodo, { foreignKey: 'id_periodo' });
Empresa.belongsTo(SalaUsuario, { foreignKey: 'id_salausuario' });

export default Empresa;