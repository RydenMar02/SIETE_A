import { Router } from 'express';
import { body } from 'express-validator';
import {
    getEmpresaCuentas,
    getEmpresaCuentaById,
    getCuentasPorNivelYPadre,
    getEstructuraCuentas,
    getCuentaByCode,
    crearEmpresaCuenta,
    actualizarEmpresaCuenta,
    desactivarEmpresaCuenta
} from '../controllers/empresaCuenta.controller.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';
import { validarPertenenciaEmpresa, resolverDesdeModelo, resolverDesdeBody } from '../middlewares/pertenencia.middleware.js';

const router = Router();
const resolverDesdeEmpresaCuenta = resolverDesdeModelo(EmpresaCuenta);

router.get('/',            validarJWT, tieneRol(2, 3), getEmpresaCuentas);
router.get('/estructura',  validarJWT, tieneRol(2, 3), getEstructuraCuentas);
router.get('/filtro',      validarJWT, tieneRol(2, 3), getCuentasPorNivelYPadre);
router.get('/:id',         validarJWT, tieneRol(2, 3), validarPertenenciaEmpresa(resolverDesdeEmpresaCuenta), getEmpresaCuentaById);
router.get('/codigo/:codigo', validarJWT, tieneRol(2, 3), getCuentaByCode);

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
    validarPertenenciaEmpresa(resolverDesdeBody),
    crearEmpresaCuenta
);

router.put('/:id',    validarJWT, tieneRol(3), validarPertenenciaEmpresa(resolverDesdeEmpresaCuenta), actualizarEmpresaCuenta);
router.delete('/:id', validarJWT, tieneRol(3), validarPertenenciaEmpresa(resolverDesdeEmpresaCuenta), desactivarEmpresaCuenta);

export default router;