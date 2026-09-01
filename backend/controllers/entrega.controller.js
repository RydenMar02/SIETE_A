import Entrega from '../models/entrega.js';
import Tarea from '../models/tarea.js';
import Empresa from '../models/empresa.js';
import SalaUsuario from '../models/salaUsuario.js';
import Calificacion from '../models/calificacion.js';
import { esProfesorDeSala, puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';

/**
 * Resuelve si el usuario logueado es específicamente el ALUMNO dueño de
 * la empresa de esta entrega (no alcanza con ser el profesor de la sala).
 * Se usa para "marcar entregada", que es una acción exclusiva del alumno.
 */
const esAlumnoDueñoDeLaEntrega = async (req, entrega) => {
    const { id_usuario, id_rol } = req.usuario;
    if (id_rol !== 3) return false;

    const empresa = await Empresa.findByPk(entrega.id_empresa, {
        include: [{ model: SalaUsuario }]
    });
    return empresa?.SalaUsuario?.id_alumno === id_usuario;
};

export const getEntregasPorTarea = async (req, res) => {
    const { id_tarea } = req.query;

    if (!id_tarea) {
        return res.status(400).json({ msg: 'id_tarea es obligatorio' });
    }

    try {
        const tarea = await Tarea.findByPk(id_tarea);
        if (!tarea) {
            return res.status(404).json({ msg: 'Tarea no encontrada' });
        }

        const { id_usuario, id_rol } = req.usuario;
        const esProfesor = await esProfesorDeSala(req, tarea.id_sala);

        const where = { id_tarea: parseInt(id_tarea) };

        if (!esProfesor && id_rol !== 1) {
            // Un alumno solo ve su propia entrega: filtramos por las
            // empresas que le pertenecen dentro de esa sala.
            const salaUsuario = await SalaUsuario.findOne({
                where: { id_sala: tarea.id_sala, tipo: 'ALUMNO', id_alumno: id_usuario, estado: 1 }
            });
            if (!salaUsuario) {
                return res.status(403).json({ msg: 'No tenés permiso para ver las entregas de esta tarea' });
            }
            const empresasPropias = await Empresa.findAll({
                where: { id_salausuario: salaUsuario.id_salausuario },
                attributes: ['id_empresa']
            });
            where.id_empresa = empresasPropias.map(e => e.id_empresa);
        }

        const entregas = await Entrega.findAll({
            where,
            include: [
                { model: Empresa, attributes: ['id_empresa', 'nombre'] },
                { model: Calificacion }
            ],
            order: [['id_empresa', 'ASC']]
        });

        res.json({ total: entregas.length, entregas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener entregas' });
    }
};

export const getEntregaById = async (req, res) => {
    const { id } = req.params;

    try {
        const entrega = await Entrega.findByPk(id, {
            include: [
                { model: Tarea },
                { model: Empresa, attributes: ['id_empresa', 'nombre'] },
                { model: Calificacion }
            ]
        });
        if (!entrega) {
            return res.status(404).json({ msg: 'Entrega no encontrada' });
        }

        if (!(await puedeAccederAEmpresa(req, entrega.id_empresa))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver esta entrega' });
        }

        res.json(entrega);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener entrega' });
    }
};

/** El alumno marca su propia entrega como realizada */
export const marcarEntregada = async (req, res) => {
    const { id } = req.params;
    const { comentario_alumno } = req.body;

    try {
        const entrega = await Entrega.findByPk(id, { include: [{ model: Tarea }] });
        if (!entrega) {
            return res.status(404).json({ msg: 'Entrega no encontrada' });
        }

        if (!(await esAlumnoDueñoDeLaEntrega(req, entrega))) {
            return res.status(403).json({ msg: 'Solo el alumno dueño de esta empresa puede marcarla como entregada' });
        }

        if (entrega.Tarea.estado === 'CERRADA') {
            return res.status(400).json({ msg: 'Esta tarea ya está cerrada, no se pueden registrar más entregas' });
        }

        if (entrega.estado === 'CORREGIDA') {
            return res.status(400).json({ msg: 'Esta entrega ya fue corregida' });
        }

        await entrega.update({
            estado: 'ENTREGADA',
            fecha_entrega: new Date(),
            comentario_alumno: comentario_alumno || null
        });

        res.json({ msg: 'Entrega registrada', entrega });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al marcar la entrega' });
    }
};

/** El profesor de la sala califica una entrega */
export const calificarEntrega = async (req, res) => {
    const { id } = req.params;
    const { nota, comentario } = req.body;

    if (nota === undefined || nota === null || isNaN(parseFloat(nota))) {
        return res.status(400).json({ msg: 'La nota es obligatoria y debe ser numérica' });
    }

    try {
        const entrega = await Entrega.findByPk(id, { include: [{ model: Tarea }] });
        if (!entrega) {
            return res.status(404).json({ msg: 'Entrega no encontrada' });
        }

        if (!(await esProfesorDeSala(req, entrega.Tarea.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede calificar esta entrega' });
        }

        if (entrega.estado === 'PENDIENTE') {
            return res.status(400).json({ msg: 'Esta entrega todavía no fue marcada como realizada por el alumno' });
        }

        await Calificacion.upsert({
            id_entrega: entrega.id_entrega,
            nota: parseFloat(nota),
            comentario: comentario || null,
            id_profesor: req.usuario.id_usuario
        });

        const calificacion = await Calificacion.findOne({ where: { id_entrega: entrega.id_entrega } });

        await entrega.update({ estado: 'CORREGIDA' });

        res.json({ msg: 'Entrega calificada', calificacion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al calificar la entrega' });
    }
};