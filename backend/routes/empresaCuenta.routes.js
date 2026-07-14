import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEmpresaCuentas,
    getEmpresaCuentaById,
    getCuentasPorNivelYPadre,
    getEstructuraCuentas,
    crearEmpresaCuenta,
    actualizarEmpresaCuenta,
    desactivarEmpresaCuenta
} from '../controllers/empresaCuenta.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',            validarJWT, tieneRol(2, 3), getEmpresaCuentas);
router.get('/estructura',  validarJWT, tieneRol(2, 3), getEstructuraCuentas);
router.get('/filtro',      validarJWT, tieneRol(2, 3), getCuentasPorNivelYPadre);
router.get('/:id',         validarJWT, tieneRol(2, 3), getEmpresaCuentaById);

router.post('/',
    validarJWT, tieneRol(3),
    [
        body('codigo').notEmpty().withMessage('El código es obligatorio'),
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('naturaleza').isIn(['ACREEDORA', 'DEUDORA']).withMessage('Naturaleza inválida'),
        body('asentable').isIn(['Si', 'No']).withMessage('Asentable inválido'),
        body('id_empresa').notEmpty().withMessage('La empresa es obligatoria'),
        validar
    ],
    crearEmpresaCuenta
);

router.put('/:id',    validarJWT, tieneRol(3), actualizarEmpresaCuenta);
router.delete('/:id', validarJWT, tieneRol(3), desactivarEmpresaCuenta);

export default router;