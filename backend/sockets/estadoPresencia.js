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

// ---------------------------------------------------------------------
// Espectar: quién (qué socket de profesor) está mirando a qué alumno, y
// el último estado de app que ese alumno reportó. Todo en memoria, igual
// que la presencia — es información efímera, no tiene sentido en MySQL.
// ---------------------------------------------------------------------

const espectadoresPorAlumno = new Map(); // "id_sala:id_alumno" -> Set(socketId del profesor)
const ultimoEstadoApp = new Map();       // "id_sala:id_alumno" -> { ruta, formulario, timestamp }

const claveAlumno = (id_sala, id_alumno) => `${id_sala}:${id_alumno}`;

/** Devuelve true si este socket de profesor es el primer espectador de ese alumno (hay que avisarle) */
export const iniciarEspectacion = (id_sala, id_alumno, socketIdProfesor) => {
    const clave = claveAlumno(id_sala, id_alumno);
    if (!espectadoresPorAlumno.has(clave)) {
        espectadoresPorAlumno.set(clave, new Set());
    }
    const espectadores = espectadoresPorAlumno.get(clave);
    const eraElPrimero = espectadores.size === 0;
    espectadores.add(socketIdProfesor);
    return eraElPrimero;
};

/** Devuelve true si, tras sacar este socket, el alumno quedó sin ningún espectador (hay que avisarle) */
export const detenerEspectacion = (id_sala, id_alumno, socketIdProfesor) => {
    const clave = claveAlumno(id_sala, id_alumno);
    const espectadores = espectadoresPorAlumno.get(clave);
    if (!espectadores) return true;

    espectadores.delete(socketIdProfesor);
    if (espectadores.size === 0) {
        espectadoresPorAlumno.delete(clave);
        return true;
    }
    return false;
};

/**
 * Se llama al desconectarse un socket de profesor: lo saca de todas las
 * espectaciones que tuviera abiertas (sin importar sala/alumno) y devuelve
 * la lista de {id_sala, id_alumno} que quedaron sin ningún espectador, para
 * avisarles a esos alumnos que ya nadie los está mirando.
 */
export const detenerTodaEspectacionDeSocket = (socketIdProfesor) => {
    const quedaronSinEspectador = [];
    for (const [clave, espectadores] of espectadoresPorAlumno.entries()) {
        if (!espectadores.has(socketIdProfesor)) continue;
        espectadores.delete(socketIdProfesor);
        if (espectadores.size === 0) {
            espectadoresPorAlumno.delete(clave);
            const [id_sala, id_alumno] = clave.split(':');
            quedaronSinEspectador.push({ id_sala: Number(id_sala), id_alumno: Number(id_alumno) });
        }
    }
    return quedaronSinEspectador;
};

export const registrarEstadoApp = (id_sala, id_alumno, ruta, formulario) => {
    const estado = { ruta, formulario, timestamp: Date.now() };
    ultimoEstadoApp.set(claveAlumno(id_sala, id_alumno), estado);
    return estado;
};

export const obtenerEstadoApp = (id_sala, id_alumno) => {
    return ultimoEstadoApp.get(claveAlumno(id_sala, id_alumno)) ?? null;
};