import { Router } from 'express';
import { body } from 'express-validator';
import {
    getActividadesPorSala,
    getActividadById,
    crearActividad,
    actualizarActividad,
    archivarActividad
} from '../controllers/actividad.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

// Alumno y profesor pueden LEER (la pertenencia real se valida adentro del controller)
router.get('/',    validarJWT, tieneRol(1, 2, 3), getActividadesPorSala);
router.get('/:id', validarJWT, tieneRol(1, 2, 3), getActividadById);

// Solo profesor puede crear/editar/archivar
router.post('/',
    validarJWT,
    tieneRol(2),
    [
        body('id_sala').notEmpty().withMessage('La sala es obligatoria'),
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('proceso').notEmpty().withMessage('El proceso/consigna es obligatorio'),
        validar
    ],
    crearActividad
);

router.put('/:id',
    validarJWT,
    tieneRol(2),
    [
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('proceso').notEmpty().withMessage('El proceso/consigna es obligatorio'),
        validar
    ],
    actualizarActividad
);

router.patch('/:id/archivar', validarJWT, tieneRol(2), archivarActividad);

export default router;