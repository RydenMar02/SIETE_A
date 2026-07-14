import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEmpresaCuentas,
    getEmpresaCuentaById,
    actualizarEmpresaCuenta,
    desactivarEmpresaCuenta
} from '../controllers/empresaCuenta.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

// El alumno y profesor pueden ver las cuentas
router.get('/',     validarJWT, tieneRol(2, 3), getEmpresaCuentas);
router.get('/:id',  validarJWT, tieneRol(2, 3), getEmpresaCuentaById);

// Solo el alumno puede modificar sus cuentas
router.put('/:id',
    validarJWT,
    tieneRol(3),
    [
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('codigo').notEmpty().withMessage('El código es obligatorio'),
        body('asentable').notEmpty().withMessage('El campo asentable es obligatorio'),
        body('naturaleza').notEmpty().withMessage('La naturaleza es obligatoria'),
        body('moneda').notEmpty().withMessage('La moneda es obligatoria'),
        validar
    ],
    actualizarEmpresaCuenta
);

router.delete('/:id', validarJWT, tieneRol(3), desactivarEmpresaCuenta);

export default router;