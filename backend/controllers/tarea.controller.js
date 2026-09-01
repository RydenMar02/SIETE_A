import Tarea from '../models/tarea.js';
import Entrega from '../models/entrega.js';
import SalaUsuario from '../models/salaUsuario.js';
import Empresa from '../models/empresa.js';
import Periodo from '../models/periodo.js';
import db from '../db/conexion.js';
import { esProfesorDeSala, puedeAccederASala } from '../middlewares/pertenencia.middleware.js';

export const getTareasPorSala = async (req, res) => {
    const { id_sala } = req.query;

    if (!id_sala) {
        return res.status(400).json({ msg: 'id_sala es obligatorio' });
    }

    try {
        if (!(await puedeAccederASala(req, parseInt(id_sala)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las tareas de esta sala' });
        }

        const tareas = await Tarea.findAll({
            where: { id_sala: parseInt(id_sala) },
            include: [{ model: Periodo, attributes: ['id_periodo', 'nombre', 'mes'] }],
            order: [['fecha_limite', 'DESC']]
        });

        res.json({ total: tareas.length, tareas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener tareas' });
    }
};

export const getTareaById = async (req, res) => {
    const { id } = req.params;

    try {
        const tarea = await Tarea.findByPk(id, {
            include: [{ model: Periodo, attributes: ['id_periodo', 'nombre', 'mes'] }]
        });
        if (!tarea) {
            return res.status(404).json({ msg: 'Tarea no encontrada' });
        }

        if (!(await puedeAccederASala(req, tarea.id_sala))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver esta tarea' });
        }

        res.json(tarea);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener tarea' });
    }
};

/**
 * Crea una tarea y genera automáticamente una Entrega en estado PENDIENTE
 * para cada alumno inscripto (con empresa activa) en la sala.
 */
export const crearTarea = async (req, res) => {
    const { id_sala, id_periodo, titulo, consigna, fecha_limite } = req.body;

    if (!id_sala || !titulo || !consigna || !fecha_limite) {
        return res.status(400).json({ msg: 'id_sala, titulo, consigna y fecha_limite son obligatorios' });
    }

    try {
        if (!(await esProfesorDeSala(req, id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede crear tareas' });
        }

        const resultado = await db.transaction(async (t) => {
            const tarea = await Tarea.create({
                id_sala,
                id_periodo: id_periodo || null,
                id_profesor: req.usuario.id_usuario,
                titulo,
                consigna,
                fecha_limite,
                estado: 'ACTIVA'
            }, { transaction: t });

            // Alumnos inscriptos y activos en la sala
            const alumnosSala = await SalaUsuario.findAll({
                where: { id_sala, tipo: 'ALUMNO', estado: 1 },
                attributes: ['id_salausuario'],
                transaction: t
            });
            const idsSalaUsuario = alumnosSala.map(su => su.id_salausuario);

            // Empresas activas de esos alumnos
            const empresas = idsSalaUsuario.length === 0 ? [] : await Empresa.findAll({
                where: { id_salausuario: idsSalaUsuario, estado: 1 },
                attributes: ['id_empresa'],
                transaction: t
            });

            if (empresas.length > 0) {
                await Entrega.bulkCreate(
                    empresas.map(e => ({
                        id_tarea: tarea.id_tarea,
                        id_empresa: e.id_empresa,
                        estado: 'PENDIENTE'
                    })),
                    { transaction: t }
                );
            }

            return { tarea, cantidadEntregas: empresas.length };
        });

        res.status(201).json({
            msg: `Tarea creada. Se generaron ${resultado.cantidadEntregas} entregas pendientes.`,
            tarea: resultado.tarea
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear tarea' });
    }
};

export const cerrarTarea = async (req, res) => {
    const { id } = req.params;

    try {
        const tarea = await Tarea.findByPk(id);
        if (!tarea) {
            return res.status(404).json({ msg: 'Tarea no encontrada' });
        }

        if (!(await esProfesorDeSala(req, tarea.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede cerrar la tarea' });
        }

        await tarea.update({ estado: 'CERRADA' });
        res.json({ msg: 'Tarea cerrada', tarea });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al cerrar tarea' });
    }
};