import { DataTypes } from 'sequelize';
import db from '../db/conexion.js';

const Sala = db.define('Sala', {
    id_sala: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sala: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    curso: {
        type: DataTypes.ENUM(
            'PRIMER_CURSO',
            'SEGUNDO_CURSO',
            'TERCER_CURSO',
            'CUARTO_CURSO',
            'QUINTO_CURSO'
        ),
        allowNull: false
    },
    semestre: {
        type: DataTypes.ENUM(
            'PRIMER_SEMESTRE',
            'SEGUNDO_SEMESTRE',
            'TERCER_SEMESTRE',
            'CUARTO_SEMESTRE',
            'QUINTO_SEMESTRE',
            'SEXTO_SEMESTRE',
            'SEPTIMO_SEMESTRE',
            'OCTAVO_SEMESTRE',
            'NOVENO_SEMESTRE',
            'DECIMO_SEMESTRE'
        ),
        allowNull: false
    },
    contra: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'sala',
    timestamps: true
});

export default Sala;