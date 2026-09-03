import Movimiento from '../models/movimiento.js';
import Usuario from '../models/usuario.js';
import Empresa from '../models/empresa.js';
import SalaUsuario from '../models/salaUsuario.js';
import { esProfesorDeSala } from '../middlewares/pertenencia.middleware.js';

/**
 * Devuelve el historial de movimientos de TODAS las empresas de una sala,
 * pero solo si quien pregunta es el profesor de esa sala puntual (o ADMIN).
 * Ni un alumno, ni el profesor de otra sala, pueden verlo.
 */
export const getMovimientosPorSala = async (req, res) => {
    const { id_sala, desde = 0 } = req.query;
    // Tope máximo de 200 filas por página, sin importar qué pida el
    // cliente -evita que alguien pida miles de registros de una sola vez.
    const limite = Math.min(parseInt(req.query.limite) || 50, 200);

    if (!id_sala) {
        return res.status(400).json({ msg: 'id_sala es obligatorio' });
    }

    try {
        if (!(await esProfesorDeSala(req, parseInt(id_sala)))) {
            return res.status(403).json({ msg: 'Solo el profesor de esta sala puede ver su historial de movimientos' });
        }

        const alumnosSala = await SalaUsuario.findAll({
            where: { id_sala: parseInt(id_sala), tipo: 'ALUMNO', estado: 1 },
            attributes: ['id_salausuario']
        });
        const idsSalaUsuario = alumnosSala.map(su => su.id_salausuario);

        const empresas = idsSalaUsuario.length === 0 ? [] : await Empresa.findAll({
            where: { id_salausuario: idsSalaUsuario },
            attributes: ['id_empresa']
        });
        const idsEmpresa = empresas.map(e => e.id_empresa);

        if (idsEmpresa.length === 0) {
            return res.json({ total: 0, movimientos: [] });
        }

        const [total, movimientos] = await Promise.all([
            Movimiento.count({ where: { id_empresa: idsEmpresa } }),
            Movimiento.findAll({
                where: { id_empresa: idsEmpresa },
                include: [
                    { model: Usuario, attributes: ['nombre', 'cedula'] },
                    { model: Empresa, attributes: ['nombre'] }
                ],
                offset: parseInt(desde),
                limit: parseInt(limite),
                order: [['createdAt', 'DESC']]
            })
        ]);

        res.json({ total, movimientos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el historial de movimientos' });
    }
};