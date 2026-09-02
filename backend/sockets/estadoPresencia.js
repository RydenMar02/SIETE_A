// Estado de presencia en memoria: quién está conectado en cada sala y qué
// está haciendo. Vive en RAM del proceso Node — se pierde si el server se
// reinicia, y no se sincroniza sola si algún día corren más de una
// instancia (ahí haría falta el adapter de Redis para Socket.IO). Para un
// solo servidor, que es el caso de SIETE, alcanza y sobra.

const presenciaPorSala = new Map(); // id_sala -> Map(id_usuario -> entrada)

const obtenerMapaSala = (id_sala) => {
    if (!presenciaPorSala.has(id_sala)) {
        presenciaPorSala.set(id_sala, new Map());
    }
    return presenciaPorSala.get(id_sala);
};

export const registrarConexion = (id_sala, usuario, socketId) => {
    const mapaSala = obtenerMapaSala(id_sala);
    const existente = mapaSala.get(usuario.id_usuario);

    if (existente) {
        // Ya estaba conectado (otra pestaña/dispositivo): solo sumamos el socket.
        existente.sockets.add(socketId);
        existente.ultimaActividad = Date.now();
    } else {
        mapaSala.set(usuario.id_usuario, {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            pagina: null,
            ultimaActividad: Date.now(),
            sockets: new Set([socketId])
        });
    }
};

/** Devuelve true si, tras sacar este socket, el usuario quedó sin ninguna conexión en esa sala */
export const registrarDesconexion = (id_sala, id_usuario, socketId) => {
    const mapaSala = presenciaPorSala.get(id_sala);
    if (!mapaSala) return true;

    const entrada = mapaSala.get(id_usuario);
    if (!entrada) return true;

    entrada.sockets.delete(socketId);
    if (entrada.sockets.size === 0) {
        mapaSala.delete(id_usuario);
        return true;
    }
    return false;
};

export const registrarActividad = (id_sala, id_usuario, pagina) => {
    const entrada = presenciaPorSala.get(id_sala)?.get(id_usuario);
    if (!entrada) return;
    entrada.pagina = pagina;
    entrada.ultimaActividad = Date.now();
};

export const listarPresenciaDeSala = (id_sala) => {
    const mapaSala = presenciaPorSala.get(id_sala);
    if (!mapaSala) return [];
    return Array.from(mapaSala.values()).map(({ id_usuario, nombre, pagina, ultimaActividad }) => ({
        id_usuario, nombre, pagina, ultimaActividad
    }));
};