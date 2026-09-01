import { Router } from 'express';
import { body } from 'express-validator';
import {
    getTareasPorSala,
    getTareaById,
    crearTarea,
    cerrarTarea
} from '../controllers/tarea.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',    validarJWT, tieneRol(1, 2, 3), getTareasPorSala);
router.get('/:id', validarJWT, tieneRol(1, 2, 3), getTareaById);

router.post('/',
    validarJWT,
    tieneRol(2),
    [
        body('id_sala').notEmpty().withMessage('La sala es obligatoria'),
        body('titulo').notEmpty().withMessage('El título es obligatorio'),
        body('consigna').notEmpty().withMessage('La consigna es obligatoria'),
        body('fecha_limite').isISO8601().withMessage('La fecha límite es obligatoria y debe ser válida'),
        validar
    ],
    crearTarea
);

router.patch('/:id/cerrar', validarJWT, tieneRol(2), cerrarTarea);

export default router;