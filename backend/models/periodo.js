import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';

const Periodo = db.define('Periodo', {
    id_periodo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    periodo: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
    tableName: 'periodo',
    timestamps: true
});

export default Periodo;