import { Router } from 'express';
import { body } from 'express-validator';
import {
    getSalasConProfesores,
    ingresarSala
} from '../controllers/salaUsuario.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/', validarJWT, tieneRol(1, 2, 3), getSalasConProfesores);

router.post('/',
    validarJWT,
    tieneRol(3),
    [
        body('id_sala').notEmpty().withMessage('La sala es obligatoria'),
        body('id_profesor').notEmpty().withMessage('El profesor es obligatorio'),
        body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
        validar
    ],
    ingresarSala
);

export default router;