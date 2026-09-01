import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEntregasPorTarea,
    getEntregaById,
    marcarEntregada,
    calificarEntrega
} from '../controllers/entrega.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',    validarJWT, tieneRol(1, 2, 3), getEntregasPorTarea);
router.get('/:id', validarJWT, tieneRol(1, 2, 3), getEntregaById);

router.patch('/:id/entregar', validarJWT, tieneRol(3), marcarEntregada);

router.patch('/:id/calificar',
    validarJWT,
    tieneRol(2),
    [
        body('nota').isFloat({ min: 0 }).withMessage('La nota es obligatoria y debe ser numérica'),
        validar
    ],
    calificarEntrega
);

export default router;