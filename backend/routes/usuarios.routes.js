import { Router } from 'express';
import multer from 'multer';
import {
    getUsuarios,
    getUsuarioById,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    restablecerPasswordUsuario,
    validarImportacionUsuarios,
    importarUsuarios,
    obtenerMiPerfil,
    actualizarMiPerfil,
    cambiarMiPassword
} from '../controllers/usuarios.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

// Archivo en memoria (nunca se escribe a disco), máximo 5 MB, solo
// .xlsx/.xls -se valida por extensión real del nombre del archivo, no
// solo por el mimetype que mande el navegador (poco confiable).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extensionValida = /\.(xlsx|xls)$/i.test(file.originalname);
        if (!extensionValida) {
            return cb(new Error('El archivo debe ser .xlsx o .xls'));
        }
        cb(null, true);
    }
});

// Middleware para traducir errores de multer (tamaño, tipo de archivo) a
// un 400 claro en vez de dejar que exploten como 500 genérico.
const manejarErrorMulter = (err, req, res, next) => {
    if (err) {
        return res.status(400).json({ msg: err.message || 'Error al procesar el archivo' });
    }
    next();
};

// IMPORTANTE: estas dos rutas van ANTES de /:id -si estuvieran después,
// Express interpretaría "perfil" como el valor de :id y las llamadas
// nunca llegarían a obtenerMiPerfil/actualizarMiPerfil. Solo validarJWT,
// sin tieneRol: el id sale del propio JWT, así que cualquier rol
// autenticado puede usarlas para SU PROPIO perfil, nunca el de otro.
router.get('/perfil', validarJWT, obtenerMiPerfil);
router.put('/perfil', validarJWT, actualizarMiPerfil);

// Mismo motivo que /perfil: debe ir antes de /:id, y solo validarJWT (sin
// tieneRol) porque cualquier rol autenticado cambia SU PROPIA contraseña.
// Distinto del reset administrativo (PUT /:id/restablecer-password, más
// abajo, que sigue exigiendo tieneRol(1) sin cambios).
router.put('/cambiar-password', validarJWT, cambiarMiPassword);

router.get('/',       validarJWT, tieneRol(1), getUsuarios);
router.get('/:id',    validarJWT, tieneRol(1), getUsuarioById);
router.post('/',      validarJWT, tieneRol(1), crearUsuario);
router.put('/:id',    validarJWT, tieneRol(1), actualizarUsuario);
router.delete('/:id', validarJWT, tieneRol(1), desactivarUsuario);
router.put('/:id/restablecer-password', validarJWT, tieneRol(1,2,3), restablecerPasswordUsuario);

router.post(
    '/importar/validar',
    validarJWT, tieneRol(1),
    (req, res, next) => upload.single('archivo')(req, res, (err) => manejarErrorMulter(err, req, res, next)),
    validarImportacionUsuarios
);
router.post(
    '/importar',
    validarJWT, tieneRol(1),
    (req, res, next) => upload.single('archivo')(req, res, (err) => manejarErrorMulter(err, req, res, next)),
    importarUsuarios
);

export default router;