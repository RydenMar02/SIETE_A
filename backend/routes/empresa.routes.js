import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEmpresas,
    getEmpresaById,
    getEmpresasPorSalaUsuario,
    crearEmpresa,
    actualizarEmpresa,
    desactivarEmpresa
} from '../controllers/empresa.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

// Alumno ve sus empresas filtradas por sala
router.get('/',            validarJWT, tieneRol(2, 3), getEmpresas);
router.get('/salausuario', validarJWT, tieneRol(2, 3), getEmpresasPorSalaUsuario);
router.get('/:id',         validarJWT, tieneRol(2, 3), getEmpresaById);

// Solo el alumno puede crear, actualizar y desactivar su empresa
router.post('/',
    validarJWT,
    tieneRol(3),
    [
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('ruc').notEmpty().withMessage('El RUC es obligatorio'),
        body('sigla').notEmpty().withMessage('La sigla es obligatoria'),
        body('id_periodo').notEmpty().withMessage('El periodo es obligatorio'),
        body('id_salausuario').notEmpty().withMessage('La sala es obligatoria'),
        validar
    ],
    crearEmpresa
);

router.put('/:id',    validarJWT, tieneRol(3), actualizarEmpresa);
router.delete('/:id', validarJWT, tieneRol(3), desactivarEmpresa);

export default router;