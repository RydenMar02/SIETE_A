import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEjerciciosPorSala,
    getEjercicioById,
    crearEjercicio,
    cerrarEjercicio
} from '../controllers/ejercicio.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',    validarJWT, tieneRol(1, 2, 3), getEjerciciosPorSala);
router.get('/:id', validarJWT, tieneRol(1, 2, 3), getEjercicioById);

router.post('/',
    validarJWT,
    tieneRol(2), // solo profesor (o admin, ya contemplado en el controller)
    [
        body('id_sala').notEmpty().withMessage('La sala es obligatoria'),
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('anio').isInt({ min: 2000, max: 2100 }).withMessage('El año es obligatorio y debe ser válido'),
        validar
    ],
    crearEjercicio
);

router.patch('/:id/cerrar', validarJWT, tieneRol(2), cerrarEjercicio);

export default router;