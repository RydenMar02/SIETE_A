import { Router } from 'express';
import { body } from 'express-validator';
import { login, register } from '../controllers/auth.controller.js';
import { validar } from '../middlewares/validaciones.middleware.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.post(
    '/login',
    [
        body('cedula').notEmpty().withMessage('La cédula es obligatoria'),
        body('contra').notEmpty().withMessage('La contraseña es obligatoria'),
        validar
    ],
    login
);

router.post(
    '/register',
    [
        validarJWT,
        tieneRol(1),
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('cedula').notEmpty().withMessage('La cédula es obligatoria'),
        body('correo').isEmail().withMessage('El correo no es válido'),
        body('contra').notEmpty().withMessage('La contraseña es obligatoria'),
        body('telefono').notEmpty().withMessage('El teléfono es obligatorio'),
        body('id_rol').isInt().withMessage('El rol es obligatorio'),
        validar
    ],
    register
);

export default router;