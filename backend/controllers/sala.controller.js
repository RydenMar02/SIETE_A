import { Sequelize } from 'sequelize';
import db from '../db/conexion.js';
import Sala from '../models/sala.js';
import SalaUsuario from '../models/salaUsuario.js';

export const getSalas = async (req, res) => {
    const { desde = 0, limite = 10 } = req.query;
    const id_profesor = req.usuario.id_usuario;

    try {
        const sql = `
            SELECT 
                s.id_sala, s.sala, s.curso, s.semestre, s.contra,
                u.id_usuario, u.nombre,
                COUNT(suAlumno.id_alumno) AS cantidad_alumnos
            FROM sala_usuario suProfesor
            INNER JOIN sala s ON s.id_sala = suProfesor.id_sala
            INNER JOIN usuario u ON u.id_usuario = suProfesor.id_profesor
            LEFT JOIN sala_usuario suAlumno 
                ON suAlumno.id_sala = s.id_sala
                AND suAlumno.tipo = 'ALUMNO'
                AND suAlumno.baja = 0
            WHERE suProfesor.id_profesor = :id_profesor
                AND suProfesor.tipo = 'PROFESOR'
            GROUP BY s.id_sala, s.sala, s.curso, s.semestre, s.contra, u.id_usuario, u.nombre
            ORDER BY s.id_sala
            LIMIT :limite OFFSET :desde
        `;

        const salas = await db.query(sql, {
            replacements: { id_profesor, limite: parseInt(limite), desde: parseInt(desde) },
            type: Sequelize.QueryTypes.SELECT
        });

        res.json({ total: salas.length, salas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener salas' });
    }
};

export const getSalaById = async (req, res) => {
    try {
        const { id } = req.params;
        const sala = await Sala.findByPk(id, { attributes: ['contra'] });
        if (!sala) return res.status(404).json({ msg: 'Sala no encontrada' });
        res.json(sala);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener sala' });
    }
};

export const getAlumnosPorSala = async (req, res) => {
    const { id } = req.params;
    const id_profesor = req.usuario.id_usuario;

    try {
        const sql = `
            SELECT 
                u.id_usuario, u.nombre, u.cedula,
                IF(u.estado = 1, 'ACTIVO', 'INACTIVO') AS estado,
                suAlumno.tipo, suAlumno.baja
            FROM sala_usuario suAlumno
            INNER JOIN usuario u ON u.id_usuario = suAlumno.id_alumno
            INNER JOIN sala_usuario suProfesor ON suProfesor.id_sala = suAlumno.id_sala
            WHERE suAlumno.id_sala = :id_sala
                AND suAlumno.tipo = 'ALUMNO'
                AND suAlumno.baja = 0
                AND suProfesor.id_profesor = :id_profesor
                AND suProfesor.tipo = 'PROFESOR'
            ORDER BY suAlumno.id_salausuario
        `;

        const alumnos = await db.query(sql, {
            replacements: { id_sala: parseInt(id), id_profesor },
            type: Sequelize.QueryTypes.SELECT
        });

        res.json({ total: alumnos.length, alumnos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener alumnos' });
    }
};

export const crearSala = async (req, res) => {
    const { sala, curso, semestre, contra } = req.body;
    const id_profesor = req.usuario.id_usuario;
    const transaction = await db.transaction();

    try {
        const nuevaSala = await Sala.create(
            { sala, curso, semestre, contra, estado: 1 },
            { transaction }
        );

        await SalaUsuario.create(
            { id_sala: nuevaSala.id_sala, id_profesor, id_alumno: null, tipo: 'PROFESOR', estado: 1, baja: 0 },
            { transaction }
        );

        await transaction.commit();
        res.status(201).json({ msg: 'Sala creada correctamente', sala: nuevaSala });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: 'Error al crear sala' });
    }
};

export const actualizarSala = async (req, res) => {
    const { id } = req.params;
    const { sala, curso, semestre, contra } = req.body;

    try {
        const registro = await Sala.findByPk(id);
        if (!registro) return res.status(404).json({ msg: 'Sala no encontrada' });
        await registro.update({ sala, curso, semestre, contra });
        res.json({ msg: 'Sala actualizada', sala: registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar sala' });
    }
};

export const desactivarSala = async (req, res) => {
    const { id } = req.params;

    try {
        const sala = await Sala.findByPk(id);
        if (!sala) return res.status(404).json({ msg: 'Sala no encontrada' });
        await sala.update({ estado: 0 });
        res.json({ msg: 'Sala desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar sala' });
    }
};