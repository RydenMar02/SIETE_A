import { Router } from 'express';
import { body } from 'express-validator';
import {
    getPeriodosPorEjercicio,
    getPeriodoById,
    cambiarEstadoPeriodo
} from '../controllers/periodo.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',    validarJWT, tieneRol(1, 2, 3), getPeriodosPorEjercicio);
router.get('/:id', validarJWT, tieneRol(1, 2, 3), getPeriodoById);

router.patch('/:id/estado',
    validarJWT,
    tieneRol(2),
    [
        body('estado').isIn(['ABIERTO', 'CERRADO']).withMessage('estado debe ser ABIERTO o CERRADO'),
        validar
    ],
    cambiarEstadoPeriodo
);

export default router;