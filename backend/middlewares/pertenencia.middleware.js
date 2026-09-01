import Empresa from '../models/empresa.js';
import SalaUsuario from '../models/salaUsuario.js';

/**
 * Núcleo de la validación: dado un id_empresa y el usuario logueado,
 * devuelve true si tiene permiso real sobre esa empresa.
 * Usado tanto por el middleware de ruta como por el helper de controller.
 */
const usuarioTienePermisoSobreEmpresa = async (req, id_empresa) => {
    const { id_usuario, id_rol } = req.usuario;
    if (id_rol === 1) return true; // ADMIN siempre pasa

    const empresa = await Empresa.findByPk(id_empresa, {
        include: [{ model: SalaUsuario }]
    });
    if (!empresa) return false;

    const salaUsuarioDueño = empresa.SalaUsuario;

    // Caso 1: soy el alumno dueño de esta empresa
    if (salaUsuarioDueño.id_alumno === id_usuario) return true;

    // Caso 2: soy profesor de la sala a la que pertenece esta empresa
    if (id_rol === 2) {
        const esProfesorDeLaSala = await SalaUsuario.findOne({
            where: {
                id_sala: salaUsuarioDueño.id_sala,
                tipo: 'PROFESOR',
                id_profesor: id_usuario,
                estado: 1
            }
        });
        if (esProfesorDeLaSala) return true;
    }

    return false;
};

/**
 * Middleware genérico que valida que el usuario logueado tenga permiso
 * real sobre el recurso que está pidiendo, en vez de confiar en el
 * id_empresa/id_salausuario que venga del query, body o params.
 *
 * Reglas de acceso:
 *  - ADMIN (id_rol 1): siempre pasa.
 *  - ALUMNO dueño de la empresa (su propio id_salausuario): pasa.
 *  - PROFESOR de la sala a la que pertenece esa empresa: pasa
 *    (necesita poder revisar/corregir el trabajo de sus alumnos).
 *  - Cualquier otro caso: 403.
 *
 * @param {(req: import('express').Request) => Promise<number|null>} obtenerIdEmpresa
 *   Función que, a partir del request, devuelve el id_empresa real del
 *   recurso pedido (o null si el recurso no existe).
 */
export const validarPertenenciaEmpresa = (obtenerIdEmpresa) => {
    return async (req, res, next) => {
        try {
            const id_empresa = await obtenerIdEmpresa(req);
            if (!id_empresa) {
                return res.status(404).json({ msg: 'Recurso no encontrado' });
            }

            const tienePermiso = await usuarioTienePermisoSobreEmpresa(req, id_empresa);
            if (!tienePermiso) {
                return res.status(403).json({ msg: 'No tenés permiso para acceder a este recurso' });
            }

            return next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ msg: 'Error al validar el permiso sobre el recurso' });
        }
    };
};

/**
 * Helper para usar DENTRO de un controller (no como middleware de ruta):
 * valida si el usuario logueado puede operar sobre un id_empresa dado.
 * Útil en listados donde id_empresa es opcional en el query pero, si
 * viene, hay que validar que sea el propio antes de usarlo en el where.
 */
export const puedeAccederAEmpresa = async (req, id_empresa) => {
    return usuarioTienePermisoSobreEmpresa(req, id_empresa);
};

/**
 * Helper para usar DENTRO de un controller (no como middleware de ruta):
 * valida si el usuario logueado puede operar sobre un id_salausuario dado
 * -sea porque es su propia fila de alumno, sea porque es el profesor de
 * esa sala, sea porque es ADMIN.
 *
 * Se usa en los pocos casos donde el recurso todavía no existe (ej: crear
 * una empresa) o donde se lista por id_salausuario en vez de por :id.
 */
export const puedeAccederASalaUsuario = async (req, id_salausuario) => {
    const { id_usuario, id_rol } = req.usuario;
    if (id_rol === 1) return true; // ADMIN

    const salaUsuario = await SalaUsuario.findByPk(id_salausuario);
    if (!salaUsuario) return false;

    if (salaUsuario.id_alumno === id_usuario) return true;

    if (id_rol === 2) {
        const esProfesorDeLaSala = await SalaUsuario.findOne({
            where: {
                id_sala: salaUsuario.id_sala,
                tipo: 'PROFESOR',
                id_profesor: id_usuario,
                estado: 1
            }
        });
        if (esProfesorDeLaSala) return true;
    }

    return false;
};

/**
 * Más estricto que puedeAccederASala: solo true si es el PROFESOR de esa
 * sala (o ADMIN). Se usa para crear/cerrar Ejercicio, que es una acción
 * exclusiva del profesor, no de cualquier miembro de la sala.
 */
export const esProfesorDeSala = async (req, id_sala) => {
    const { id_usuario, id_rol } = req.usuario;
    if (id_rol === 1) return true; // ADMIN

    if (id_rol !== 2) return false;

    const salaUsuario = await SalaUsuario.findOne({
        where: { id_sala, tipo: 'PROFESOR', id_profesor: id_usuario, estado: 1 }
    });
    return !!salaUsuario;
};

/**
 * Menos estricto que esProfesorDeSala: true si es alumno O profesor de esa
 * sala, o ADMIN. Se usa para simplemente ver el/los ejercicios de una sala.
 */
export const puedeAccederASala = async (req, id_sala) => {
    const { id_usuario, id_rol } = req.usuario;
    if (id_rol === 1) return true; // ADMIN

    const salaUsuario = await SalaUsuario.findOne({
        where: {
            id_sala,
            estado: 1,
            ...(id_rol === 2 ? { id_profesor: id_usuario } : { id_alumno: id_usuario })
        }
    });
    return !!salaUsuario;
};

// ---------------------------------------------------------------------
// Resolvers listos para usar, uno por tipo de recurso.
// Cada uno sabe cómo llegar desde el :id de la ruta hasta el id_empresa real.
// ---------------------------------------------------------------------

/** Para rutas donde :id ES el id_empresa (ej: GET/PUT/DELETE /empresas/:id) */
export const resolverDesdeEmpresa = async (req) => {
    return parseInt(req.params.id) || null;
};

/** Genérico: para modelos que tienen id_empresa directo (Asiento, EmpresaCuenta, ClienteProveedor, Sucursal) */
export const resolverDesdeModelo = (modelo) => async (req) => {
    const registro = await modelo.findByPk(req.params.id, { attributes: ['id_empresa'] });
    return registro?.id_empresa ?? null;
};

/** Para CompraVenta, que no tiene id_empresa directo, solo id_sucursal */
export const resolverDesdeCompraVenta = (CompraVenta, Sucursal) => async (req) => {
    const compraVenta = await CompraVenta.findByPk(req.params.id, { attributes: ['id_sucursal'] });
    if (!compraVenta) return null;
    const sucursal = await Sucursal.findByPk(compraVenta.id_sucursal, { attributes: ['id_empresa'] });
    return sucursal?.id_empresa ?? null;
};

/** Para rutas donde el id_empresa viene directo en los params con otro nombre (ej: /resumen/:id_empresa) */
export const resolverDesdeParam = (nombreParam = 'id_empresa') => async (req) => {
    return parseInt(req.params[nombreParam]) || null;
};

/** Para POST de CompraVenta, donde el body trae id_sucursal, no id_empresa */
export const resolverDesdeSucursalBody = (Sucursal) => async (req) => {
    const id_sucursal = parseInt(req.body.id_sucursal);
    if (!id_sucursal) return null;
    const sucursal = await Sucursal.findByPk(id_sucursal, { attributes: ['id_empresa'] });
    return sucursal?.id_empresa ?? null;
};

/** Para rutas de creación (POST), donde el id_empresa viene en el body */
export const resolverDesdeBody = async (req) => {
    return parseInt(req.body.id_empresa) || null;
};