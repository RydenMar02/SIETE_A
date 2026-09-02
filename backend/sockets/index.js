import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Mensaje from '../models/mensaje.js';
import { puedeAccederASala } from '../middlewares/pertenencia.middleware.js';
import {
    registrarConexion,
    registrarDesconexion,
    registrarActividad,
    listarPresenciaDeSala
} from './estadoPresencia.js';

/**
 * Arranca Socket.IO sobre el mismo http.Server que ya usa Express
 * (server.js lo envuelve). No toca las rutas REST existentes, corre en
 * paralelo — mismo puerto, mismo proceso.
 */
export const initSockets = (httpServer) => {
    const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map((origen) => origen.trim());

    const io = new Server(httpServer, {
        cors: {
            origin: origenesPermitidos,
            credentials: true
        }
    });

    // Mismo JWT que ya usás en las rutas REST (validarJWT), pero acá se
    // valida una sola vez en el handshake de conexión, no en cada evento.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('No hay token'));

        try {
            const payload = jwt.verify(token, process.env.SECRETORPRIVATEKEY);
            socket.usuario = payload; // { id_usuario, id_rol, nombre }
            next();
        } catch (error) {
            next(new Error('Token no válido'));
        }
    });

    io.on('connection', (socket) => {
        const { usuario } = socket;
        socket.data.salasUnidas = new Set();

        // Room personal: permite mandarle un evento a este usuario puntual
        // sin importar en qué sala/pantalla esté ni cuántas pestañas tenga.
        socket.join(`usuario:${usuario.id_usuario}`);

        // Al conectar, le mandamos cuántos mensajes sin leer tiene ya
        // guardados en la base, para que el contador de la campanita esté
        // bien desde el arranque y no dependa solo de lo que llegue en vivo.
        Mensaje.count({ where: { id_receptor: usuario.id_usuario, leido: 0 } })
            .then((cantidad) => socket.emit('contador-no-leidos', cantidad))
            .catch((error) => console.error('Error al contar mensajes no leídos:', error));

        socket.on('unirse-sala', async ({ id_sala }) => {
            if (!id_sala) return;

            const tienePermiso = await puedeAccederASala({ usuario }, id_sala).catch(() => false);
            if (!tienePermiso) return;

            socket.join(`sala:${id_sala}`);
            socket.data.salasUnidas.add(id_sala);
            registrarConexion(id_sala, usuario, socket.id);
            io.to(`sala:${id_sala}`).emit('presencia-actualizada', listarPresenciaDeSala(id_sala));
        });

        socket.on('actividad', ({ pagina }) => {
            for (const id_sala of socket.data.salasUnidas) {
                registrarActividad(id_sala, usuario.id_usuario, pagina);
                io.to(`sala:${id_sala}`).emit('presencia-actualizada', listarPresenciaDeSala(id_sala));
            }
        });

        socket.on('enviar-mensaje', async ({ id_sala, id_receptor, contenido }) => {
            if (!id_sala || !id_receptor || !contenido?.trim()) return;

            const tienePermiso = await puedeAccederASala({ usuario }, id_sala).catch(() => false);
            if (!tienePermiso) return;

            try {
                const mensaje = await Mensaje.create({
                    id_sala,
                    id_emisor: usuario.id_usuario,
                    id_receptor,
                    contenido: contenido.trim().slice(0, 500),
                    leido: 0
                });

                const payload = {
                    id_mensaje: mensaje.id_mensaje,
                    id_sala,
                    id_emisor: usuario.id_usuario,
                    nombreEmisor: usuario.nombre,
                    id_receptor,
                    contenido: mensaje.contenido,
                    createdAt: mensaje.createdAt
                };

                io.to(`usuario:${id_receptor}`).emit('nuevo-mensaje', payload);
                io.to(`usuario:${usuario.id_usuario}`).emit('nuevo-mensaje', payload); // eco a otras pestañas propias

                const noLeidos = await Mensaje.count({ where: { id_receptor, leido: 0 } });
                io.to(`usuario:${id_receptor}`).emit('contador-no-leidos', noLeidos);
            } catch (error) {
                console.error('Error al guardar mensaje:', error);
            }
        });

        socket.on('marcar-leidos', async () => {
            try {
                await Mensaje.update(
                    { leido: 1 },
                    { where: { id_receptor: usuario.id_usuario, leido: 0 } }
                );
                socket.emit('contador-no-leidos', 0);
            } catch (error) {
                console.error('Error al marcar mensajes como leídos:', error);
            }
        });

        socket.on('disconnect', () => {
            for (const id_sala of socket.data.salasUnidas) {
                const quedoSinConexion = registrarDesconexion(id_sala, usuario.id_usuario, socket.id);
                if (quedoSinConexion) {
                    io.to(`sala:${id_sala}`).emit('presencia-actualizada', listarPresenciaDeSala(id_sala));
                }
            }
        });
    });

    return io;
};