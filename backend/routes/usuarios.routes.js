import { Router } from 'express';
import {
    getUsuarios,
    getUsuarioById,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario
} from '../controllers/usuarios.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.get('/',       validarJWT, tieneRol(1), getUsuarios);
router.get('/:id',    validarJWT, tieneRol(1), getUsuarioById);
router.post('/',      validarJWT, tieneRol(1), crearUsuario);
router.put('/:id',    validarJWT, tieneRol(1), actualizarUsuario);
router.delete('/:id', validarJWT, tieneRol(1), desactivarUsuario);

export default router;