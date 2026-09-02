import { Op } from 'sequelize';
import Mensaje from '../models/mensaje.js';
import Usuario from '../models/usuario.js';
import { puedeAccederASala } from '../middlewares/pertenencia.middleware.js';

// Todos los mensajes dirigidos al usuario logueado, para el historial de la
// campanita de notificaciones. El envío en tiempo real va por el socket
// (evento "enviar-mensaje"); este endpoint solo lee lo ya persistido.
export const getMensajesRecibidos = async (req, res) => {
    try {
        const mensajes = await Mensaje.findAll({
            where: { id_receptor: req.usuario.id_usuario },
            include: [{ model: Usuario, as: 'Emisor', attributes: ['id_usuario', 'nombre'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json({ total: mensajes.length, mensajes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener los mensajes' });
    }
};

// Conversación entre el usuario logueado y otro usuario puntual, dentro de
// una sala. La usa "Seguimiento en aula" al abrir el hilo con un alumno.
export const getConversacion = async (req, res) => {
    const { id_sala, id_usuario } = req.query;

    if (!id_sala || !id_usuario) {
        return res.status(400).json({ msg: 'id_sala e id_usuario son obligatorios' });
    }

    try {
        if (!(await puedeAccederASala(req, parseInt(id_sala)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver esta conversación' });
        }

        const propioId = req.usuario.id_usuario;
        const otroId = parseInt(id_usuario);

        const mensajes = await Mensaje.findAll({
            where: {
                id_sala: parseInt(id_sala),
                [Op.or]: [
                    { id_emisor: propioId, id_receptor: otroId },
                    { id_emisor: otroId, id_receptor: propioId }
                ]
            },
            include: [{ model: Usuario, as: 'Emisor', attributes: ['id_usuario', 'nombre'] }],
            order: [['createdAt', 'ASC']]
        });

        res.json({ total: mensajes.length, mensajes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener la conversación' });
    }
};

export const marcarTodosLeidos = async (req, res) => {
    try {
        await Mensaje.update(
            { leido: 1 },
            { where: { id_receptor: req.usuario.id_usuario, leido: 0 } }
        );
        res.json({ msg: 'Mensajes marcados como leídos' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al marcar los mensajes como leídos' });
    }
};