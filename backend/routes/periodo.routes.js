import { Router } from 'express';
import { body } from 'express-validator';
import {
    getPeriodos,
    getPeriodoById,
    crearPeriodo,
    actualizarPeriodo,
    eliminarPeriodo
} from '../controllers/periodo.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',       validarJWT, tieneRol(1, 2), getPeriodos);
router.get('/:id',    validarJWT, tieneRol(1, 2), getPeriodoById);

router.post('/',
    validarJWT,
    tieneRol(2),
    [
        body('periodo').notEmpty().withMessage('El periodo es obligatorio'),
        validar
    ],
    crearPeriodo
);

router.put('/:id',    validarJWT, tieneRol(2), actualizarPeriodo);
router.delete('/:id', validarJWT, tieneRol(2), eliminarPeriodo);

export default router;