import Periodo from '../models/periodo.js';
import Ejercicio from '../models/ejercicio.js';
import { puedeAccederASala, esProfesorDeSala } from '../middlewares/pertenencia.middleware.js';

// Los periodos ya no se crean sueltos: se generan automáticamente (los 12
// meses) al crear un Ejercicio (ver ejercicio.controller.js). Este archivo
// se limita a listarlos y a abrir/cerrar un mes puntual.

export const getPeriodosPorEjercicio = async (req, res) => {
    const { id_ejercicio } = req.query;

    if (!id_ejercicio) {
        return res.status(400).json({ msg: 'id_ejercicio es obligatorio' });
    }

    try {
        const ejercicio = await Ejercicio.findByPk(id_ejercicio);
        if (!ejercicio) {
            return res.status(404).json({ msg: 'Ejercicio no encontrado' });
        }

        if (!(await puedeAccederASala(req, ejercicio.id_sala))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los periodos de este ejercicio' });
        }

        const periodos = await Periodo.findAll({
            where: { id_ejercicio },
            order: [['mes', 'ASC']]
        });

        res.json({ total: periodos.length, periodos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener periodos' });
    }
};

export const getPeriodoById = async (req, res) => {
    try {
        const { id } = req.params;
        const periodo = await Periodo.findByPk(id, { include: [{ model: Ejercicio }] });
        if (!periodo) {
            return res.status(404).json({ msg: 'Periodo no encontrado' });
        }

        if (!(await puedeAccederASala(req, periodo.Ejercicio.id_sala))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver este periodo' });
        }

        res.json(periodo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener periodo' });
    }
};

/** Abre o cierra un mes puntual (ej: reabrir marzo para corregir algo) */
export const cambiarEstadoPeriodo = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ABIERTO', 'CERRADO'].includes(estado)) {
        return res.status(400).json({ msg: 'estado debe ser ABIERTO o CERRADO' });
    }

    try {
        const periodo = await Periodo.findByPk(id, { include: [{ model: Ejercicio }] });
        if (!periodo) {
            return res.status(404).json({ msg: 'Periodo no encontrado' });
        }

        if (!(await esProfesorDeSala(req, periodo.Ejercicio.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede cambiar el estado de un periodo' });
        }

        await periodo.update({ estado });
        res.json({ msg: `Periodo ${estado === 'ABIERTO' ? 'reabierto' : 'cerrado'}`, periodo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al cambiar el estado del periodo' });
    }
};