import { Router } from 'express';
import { body, param } from 'express-validator';
import {
    getSalas,
    getSalaById,
    getAlumnosPorSala,
    crearSala,
    actualizarSala,
    desactivarSala
} from '../controllers/sala.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',        validarJWT, tieneRol(1, 2), getSalas);
router.get('/:id',     validarJWT, tieneRol(1, 2), getSalaById);
router.get('/:id/alumnos', validarJWT, tieneRol(2), getAlumnosPorSala);

router.post('/',
    validarJWT,
    tieneRol(2),
    [
        body('sala').notEmpty().withMessage('El nombre de la sala es obligatorio'),
        body('curso').notEmpty().withMessage('El curso es obligatorio'),
        body('semestre').notEmpty().withMessage('El semestre es obligatorio'),
        body('contra').notEmpty().withMessage('La contraseña es obligatoria'),
        validar
    ],
    crearSala
);

router.put('/:id',    validarJWT, tieneRol(2), actualizarSala);
router.delete('/:id', validarJWT, tieneRol(2), desactivarSala);

export default router;