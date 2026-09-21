import { Op } from 'sequelize';
import * as XLSX from 'xlsx';
import Usuario from '../models/usuario.js';
import Rol from '../models/rol.js';
import db from '../db/conexion.js';
import { hashPassword, compararPassword } from '../helpers/bcrypt.js';

// Contraseña temporal fija usada tanto al crear un usuario desde el panel
// admin como al restablecer -nunca se acepta una contraseña del cliente
// para estas dos acciones, siempre se hashea este mismo valor conocido.
const PASSWORD_INICIAL = '12345678';
// Desde el panel admin solo se pueden crear/restablecer PROFESOR (2) y
// ALUMNO (3) -crear otro ADMIN (1) no está contemplado por esta pantalla.
const ROLES_GESTIONABLES_DESDE_ADMIN = [2, 3];

export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['contra'] },
            include: { model: Rol, attributes: ['rol'] }
        });
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener usuarios' });
    }
};

export const getUsuarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['contra'] },
            include: { model: Rol, attributes: ['rol'] }
        });
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener usuario' });
    }
};

/**
 * PUT /api/usuarios/cambiar-password
 * Cambio de CONTRASEÑA PROPIA -distinto del reset administrativo
 * (restablecerPasswordUsuario, que sigue intacto y sin tocar). El id a
 * modificar sale exclusivamente de req.usuario.id_usuario (JWT); cualquier
 * id_usuario/id_rol/estado que venga en el body se ignora por completo,
 * ni siquiera se lee.
 *
 * Exige conocer la contraseña ACTUAL (comparada con compararPassword
 * contra el hash real, nunca con === directo) antes de aceptar la nueva.
 */
export const cambiarMiPassword = async (req, res) => {
    try {
        const { id_usuario } = req.usuario;
        const { contra_actual, contra_nueva } = req.body;

        if (!contra_actual || !contra_nueva) {
            return res.status(400).json({ msg: 'contra_actual y contra_nueva son obligatorias' });
        }
        if (contra_nueva.length < 8) {
            return res.status(400).json({ msg: 'La nueva contraseña debe tener al menos 8 caracteres' });
        }
        if (contra_nueva === contra_actual) {
            return res.status(400).json({ msg: 'La nueva contraseña no puede ser igual a la actual' });
        }

        const usuario = await Usuario.findByPk(id_usuario);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        if (!compararPassword(contra_actual, usuario.contra)) {
            return res.status(400).json({ msg: 'La contraseña actual es incorrecta' });
        }

        await usuario.update({ contra: hashPassword(contra_nueva) });

        res.json({ msg: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al cambiar la contraseña' });
    }
};

/**
 * GET /api/usuarios/perfil
 * Devuelve el perfil del usuario AUTENTICADO -el id sale exclusivamente
 * de req.usuario.id_usuario (payload del JWT verificado por validarJWT),
 * nunca de un :id de la URL. Por eso no necesita tieneRol(1): cualquier
 * rol autenticado puede ver su propio perfil.
 */
export const obtenerMiPerfil = async (req, res) => {
    try {
        const { id_usuario } = req.usuario;

        const usuario = await Usuario.findByPk(id_usuario, {
            attributes: ['id_usuario', 'nombre', 'cedula', 'correo', 'telefono', 'id_rol']
        });
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el perfil' });
    }
};

/**
 * PUT /api/usuarios/perfil
 * Actualiza el perfil del usuario AUTENTICADO. El id a modificar sale
 * exclusivamente de req.usuario.id_usuario -nunca de params ni de un
 * id_usuario que venga en el body, así que no existe forma de editar la
 * fila de otro usuario llamando a este endpoint.
 *
 * Solo acepta nombre/cedula/correo/telefono: id_rol, estado, contra e
 * id_usuario se ignoran por completo aunque vengan en el body -ni
 * siquiera se leen del payload.
 */
export const actualizarMiPerfil = async (req, res) => {
    try {
        const { id_usuario } = req.usuario;
        const { nombre, cedula, correo, telefono } = req.body;

        if (!nombre || !cedula || !correo || !telefono) {
            return res.status(400).json({ msg: 'nombre, cedula, correo y telefono son obligatorios' });
        }
        if (nombre.length > 50) {
            return res.status(400).json({ msg: 'El nombre no puede superar los 50 caracteres' });
        }
        if (cedula.length > 8) {
            return res.status(400).json({ msg: 'La cédula no puede superar los 8 caracteres' });
        }
        if (correo.length > 50) {
            return res.status(400).json({ msg: 'El correo no puede superar los 50 caracteres' });
        }
        if (!REGEX_CORREO.test(correo)) {
            return res.status(400).json({ msg: 'Correo inválido' });
        }
        if (telefono.length > 10) {
            return res.status(400).json({ msg: 'El teléfono no puede superar los 10 caracteres' });
        }

        const usuario = await Usuario.findByPk(id_usuario);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Permite conservar la propia cédula sin chocar contra sí mismo;
        // solo rechaza si OTRO usuario ya tiene la cédula nueva.
        if (cedula !== usuario.cedula) {
            const otroConEsaCedula = await Usuario.findOne({
                where: { cedula, id_usuario: { [Op.ne]: id_usuario } }
            });
            if (otroConEsaCedula) {
                return res.status(400).json({ msg: 'Ya existe un usuario con esa cédula' });
            }
        }

        await usuario.update({ nombre, cedula, correo, telefono });

        res.json({
            msg: 'Perfil actualizado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                cedula: usuario.cedula,
                correo: usuario.correo,
                telefono: usuario.telefono,
                id_rol: usuario.id_rol
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar el perfil' });
    }
};

/**
 * Crear usuario desde el panel de administración. La contraseña NUNCA se
 * acepta del body -incluso si el cliente la mandara, se ignora- siempre
 * se asigna la contraseña inicial fija, hasheada con el mismo mecanismo
 * que ya usa el resto del sistema (bcryptjs, helpers/bcrypt.js).
 */
export const crearUsuario = async (req, res) => {
    try {
        const { nombre, cedula, correo, telefono, id_rol } = req.body;

        if (!nombre || !cedula || !correo || !telefono || !id_rol) {
            return res.status(400).json({ msg: 'nombre, cedula, correo, telefono e id_rol son obligatorios' });
        }

        const idRolNum = parseInt(id_rol);
        if (!ROLES_GESTIONABLES_DESDE_ADMIN.includes(idRolNum)) {
            return res.status(400).json({ msg: 'Desde este panel solo se pueden crear usuarios con rol Profesor o Alumno' });
        }

        const existe = await Usuario.findOne({ where: { cedula } });
        if (existe) {
            return res.status(400).json({ msg: 'Ya existe un usuario con esa cédula' });
        }

        const hash = hashPassword(PASSWORD_INICIAL);

        const usuario = await Usuario.create({
            nombre,
            cedula,
            correo,
            contra: hash,
            telefono,
            id_rol: idRolNum
        });

        res.status(201).json({
            msg: 'Usuario creado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                cedula: usuario.cedula,
                correo: usuario.correo,
                telefono: usuario.telefono,
                id_rol: usuario.id_rol
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear usuario' });
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, cedula, correo, telefono, id_rol, contra } = req.body;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const data = { nombre, cedula, correo, telefono, id_rol };

        if (contra) {
            data.contra = hashPassword(contra);
        }

        await usuario.update(data);
        res.json({ msg: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar usuario' });
    }
};

export const desactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        await usuario.update({ estado: 0 });
        res.json({ msg: 'Usuario desactivado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar usuario' });
    }
};

/**
 * Restablece la contraseña de un profesor o alumno a la contraseña
 * inicial fija, hasheada. Nunca devuelve el hash ni la contraseña en la
 * respuesta -solo un mensaje de confirmación.
 */
export const restablecerPasswordUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        if (!ROLES_GESTIONABLES_DESDE_ADMIN.includes(usuario.id_rol)) {
            return res.status(400).json({ msg: 'Solo se puede restablecer la contraseña de un profesor o un alumno' });
        }

        const hash = hashPassword(PASSWORD_INICIAL);
        await usuario.update({ contra: hash });

        res.json({ msg: 'Contraseña restablecida correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al restablecer la contraseña' });
    }
};

// ============================================================
// IMPORTACIÓN MASIVA DE USUARIOS DESDE EXCEL
// ============================================================

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROL_TEXTO_A_ID = { PROFESOR: 2, ALUMNO: 3 };

/**
 * Lee el buffer del archivo (.xlsx/.xls) y devuelve las filas de la
 * primera hoja como objetos, con las claves normalizadas a minúscula y
 * sin espacios -para no depender de que el encabezado del Excel venga
 * escrito exactamente igual ("Nombre", "NOMBRE", " nombre " deben
 * funcionar todos igual).
 */
const leerFilasExcel = (buffer) => {
    const libro = XLSX.read(buffer, { type: 'buffer' });
    const nombreHoja = libro.SheetNames[0];
    if (!nombreHoja) return [];

    const hoja = libro.Sheets[nombreHoja];
    const filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

    return filasCrudas.map((filaCruda) => {
        const filaNormalizada = {};
        for (const [clave, valor] of Object.entries(filaCruda)) {
            filaNormalizada[String(clave).trim().toLowerCase()] = typeof valor === 'string' ? valor.trim() : valor;
        }
        return filaNormalizada;
    });
};

/**
 * Valida TODAS las filas leídas del Excel: campos obligatorios, formato,
 * límites de longitud (iguales a las columnas reales de Usuario), rol
 * válido (nunca ADMIN), cédula duplicada dentro del propio archivo, y
 * cédula ya existente en BD (consultada UNA sola vez, no por fila).
 *
 * Devuelve { errores, filasValidas }. filasValidas ya viene lista para
 * bulkCreate (con id_rol numérico y contra hasheada) -pero el caller
 * decide si insertar o no según si errores.length === 0.
 */
const validarFilasImportacion = async (filas) => {
    const errores = [];
    const cedulasVistasEnArchivo = new Map(); // cedula -> primera fila donde apareció

    const cedulasDelArchivo = filas
        .map((f) => String(f.cedula ?? '').trim())
        .filter((c) => c.length > 0);

    const existentes = cedulasDelArchivo.length > 0
        ? await Usuario.findAll({ where: { cedula: { [Op.in]: cedulasDelArchivo } }, attributes: ['cedula'] })
        : [];
    const cedulasExistentesEnBD = new Set(existentes.map((u) => u.cedula));

    const filasValidas = [];

    filas.forEach((fila, indice) => {
        const numeroFila = indice + 2; // fila 1 es el encabezado
        const nombre = String(fila.nombre ?? '').trim();
        const cedula = String(fila.cedula ?? '').trim();
        const correo = String(fila.correo ?? '').trim();
        const telefono = String(fila.telefono ?? '').trim();
        const rolTexto = String(fila.rol ?? '').trim().toUpperCase();

        if (!nombre) errores.push({ fila: numeroFila, campo: 'nombre', msg: 'El nombre es obligatorio' });
        else if (nombre.length > 50) errores.push({ fila: numeroFila, campo: 'nombre', msg: 'El nombre no puede superar los 50 caracteres' });

        if (!cedula) errores.push({ fila: numeroFila, campo: 'cedula', msg: 'La cédula es obligatoria' });
        else if (cedula.length > 8) errores.push({ fila: numeroFila, campo: 'cedula', msg: 'La cédula no puede superar los 8 caracteres' });

        if (!correo) errores.push({ fila: numeroFila, campo: 'correo', msg: 'El correo es obligatorio' });
        else if (correo.length > 50) errores.push({ fila: numeroFila, campo: 'correo', msg: 'El correo no puede superar los 50 caracteres' });
        else if (!REGEX_CORREO.test(correo)) errores.push({ fila: numeroFila, campo: 'correo', msg: 'Correo inválido' });

        if (!telefono) errores.push({ fila: numeroFila, campo: 'telefono', msg: 'El teléfono es obligatorio' });
        else if (telefono.length > 10) errores.push({ fila: numeroFila, campo: 'telefono', msg: 'El teléfono no puede superar los 10 caracteres' });

        if (!rolTexto) {
            errores.push({ fila: numeroFila, campo: 'rol', msg: 'El rol es obligatorio' });
        } else if (rolTexto === 'ADMIN' || rolTexto === 'ADMINISTRADOR') {
            errores.push({ fila: numeroFila, campo: 'rol', msg: 'No se pueden importar usuarios con rol Administrador' });
        } else if (!ROL_TEXTO_A_ID[rolTexto]) {
            errores.push({ fila: numeroFila, campo: 'rol', msg: 'El rol debe ser PROFESOR o ALUMNO' });
        }

        if (cedula) {
            if (cedulasVistasEnArchivo.has(cedula)) {
                errores.push({ fila: numeroFila, campo: 'cedula', msg: `Cédula duplicada dentro del archivo (ya aparece en la fila ${cedulasVistasEnArchivo.get(cedula)})` });
            } else {
                cedulasVistasEnArchivo.set(cedula, numeroFila);
            }
            if (cedulasExistentesEnBD.has(cedula)) {
                errores.push({ fila: numeroFila, campo: 'cedula', msg: 'Ya existe un usuario con esa cédula en el sistema' });
            }
        }

        filasValidas.push({
            fila: numeroFila,
            nombre,
            cedula,
            correo,
            telefono,
            rol: rolTexto,
            id_rol: ROL_TEXTO_A_ID[rolTexto] || null
        });
    });

    return { errores, filasValidas };
};

/**
 * POST /api/usuarios/importar/validar
 * Lee y valida el Excel COMPLETO, pero no inserta nada -es una
 * previsualización. multer entrega el archivo en memoria (req.file.buffer).
 */
export const validarImportacionUsuarios = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Debe adjuntar un archivo .xlsx o .xls' });
        }

        const filas = leerFilasExcel(req.file.buffer);
        if (filas.length === 0) {
            return res.status(400).json({ msg: 'El archivo no contiene filas para importar' });
        }

        const { errores, filasValidas } = await validarFilasImportacion(filas);

        if (errores.length > 0) {
            return res.status(400).json({ msg: 'El archivo contiene errores', errores });
        }

        res.json({
            msg: 'Archivo válido',
            total: filasValidas.length,
            usuarios: filasValidas.map(({ fila, nombre, cedula, correo, telefono, rol }) => ({
                fila, nombre, cedula, correo, telefono, rol
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al validar el archivo. Confirmá que sea un Excel (.xlsx/.xls) válido.' });
    }
};

/**
 * POST /api/usuarios/importar
 * Vuelve a validar TODO el archivo desde cero (nunca confía en una
 * llamada previa a /importar/validar) y, solo si no hay ningún error,
 * inserta todos los usuarios dentro de una única transacción. Si algo
 * falla durante el insert, rollback completo -no se acepta insertar una
 * parte del archivo.
 */
export const importarUsuarios = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Debe adjuntar un archivo .xlsx o .xls' });
        }

        const filas = leerFilasExcel(req.file.buffer);
        if (filas.length === 0) {
            return res.status(400).json({ msg: 'El archivo no contiene filas para importar' });
        }

        const { errores, filasValidas } = await validarFilasImportacion(filas);

        if (errores.length > 0) {
            return res.status(400).json({ msg: 'El archivo contiene errores', errores });
        }

        const usuariosParaCrear = filasValidas.map((f) => ({
            nombre: f.nombre,
            cedula: f.cedula,
            correo: f.correo,
            telefono: f.telefono,
            id_rol: f.id_rol,
            contra: hashPassword(PASSWORD_INICIAL)
        }));

        const resultado = await db.transaction(async (t) => {
            return Usuario.bulkCreate(usuariosParaCrear, { transaction: t });
        });

        res.status(201).json({
            msg: 'Usuarios importados correctamente',
            total: resultado.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al importar usuarios. No se insertó ningún registro.' });
    }
};