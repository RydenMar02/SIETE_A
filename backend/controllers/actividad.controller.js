import Actividad from '../models/actividad.js';
import Usuario from '../models/usuario.js';
import { esProfesorDeSala, puedeAccederASala } from '../middlewares/pertenencia.middleware.js';

export const getActividadesPorSala = async (req, res) => {
    const { id_sala } = req.query;

    if (!id_sala) {
        return res.status(400).json({ msg: 'id_sala es obligatorio' });
    }

    try {
        if (!(await puedeAccederASala(req, parseInt(id_sala)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las actividades de esta sala' });
        }

        const actividades = await Actividad.findAll({
            where: { id_sala: parseInt(id_sala), estado: 1 },
            include: [{ model: Usuario, as: 'profesor', attributes: ['nombre'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ total: actividades.length, actividades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener actividades' });
    }
};

export const getActividadById = async (req, res) => {
    const { id } = req.params;

    try {
        const actividad = await Actividad.findByPk(id, {
            include: [{ model: Usuario, as: 'profesor', attributes: ['nombre'] }]
        });
        if (!actividad) {
            return res.status(404).json({ msg: 'Actividad no encontrada' });
        }

        if (!(await puedeAccederASala(req, actividad.id_sala))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver esta actividad' });
        }

        res.json(actividad);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener actividad' });
    }
};

export const crearActividad = async (req, res) => {
    const { id_sala, nombre, proceso } = req.body;

    if (!id_sala || !nombre || !proceso) {
        return res.status(400).json({ msg: 'id_sala, nombre y proceso son obligatorios' });
    }

    try {
        if (!(await esProfesorDeSala(req, id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede crear actividades' });
        }

        const actividad = await Actividad.create({
            id_sala,
            id_profesor: req.usuario.id_usuario,
            nombre,
            proceso,
            estado: 1
        });

        res.status(201).json({ msg: 'Actividad creada', actividad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear actividad' });
    }
};

/** Solo el profesor de la sala puede editar -el alumno solo puede leer (getActividadById/getActividadesPorSala) */
export const actualizarActividad = async (req, res) => {
    const { id } = req.params;
    const { nombre, proceso } = req.body;

    try {
        const actividad = await Actividad.findByPk(id);
        if (!actividad) {
            return res.status(404).json({ msg: 'Actividad no encontrada' });
        }

        if (!(await esProfesorDeSala(req, actividad.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede modificar esta actividad' });
        }

        await actividad.update({ nombre, proceso });
        res.json({ msg: 'Actividad actualizada', actividad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar actividad' });
    }
};

export const archivarActividad = async (req, res) => {
    const { id } = req.params;

    try {
        const actividad = await Actividad.findByPk(id);
        if (!actividad) {
            return res.status(404).json({ msg: 'Actividad no encontrada' });
        }

        if (!(await esProfesorDeSala(req, actividad.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede archivar esta actividad' });
        }

        await actividad.update({ estado: 0 });
        res.json({ msg: 'Actividad archivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al archivar actividad' });
    }
};