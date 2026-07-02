import { Router } from 'express';
import {
    getRoles,
    getRolById,
    crearRol,
    actualizarRol,
    eliminarRol
} from '../controllers/roles.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.get('/',       validarJWT, tieneRol(1), getRoles);
router.get('/:id',    validarJWT, tieneRol(1), getRolById);
router.post('/',      validarJWT, tieneRol(1), crearRol);
router.put('/:id',    validarJWT, tieneRol(1), actualizarRol);
router.delete('/:id', validarJWT, tieneRol(1), eliminarRol);

export default router;