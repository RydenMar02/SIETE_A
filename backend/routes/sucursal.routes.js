import { Router } from 'express';
import { body } from 'express-validator';
import {
    getSucursales,
    getSucursalById,
    crearSucursal,
    actualizarSucursal,
    desactivarSucursal
} from '../controllers/sucursal.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',     validarJWT, tieneRol(2, 3), getSucursales);
router.get('/:id',  validarJWT, tieneRol(2, 3), getSucursalById);

router.post('/',
    validarJWT,
    tieneRol(2,3),
    [
        body('id_empresa').notEmpty().withMessage('La empresa es obligatoria'),
        body('codigo').notEmpty().withMessage('El código es obligatorio'),
        body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
        body('telefono').notEmpty().withMessage('El teléfono es obligatorio'),
        body('responsable').notEmpty().withMessage('El responsable es obligatorio'),
        validar
    ],
    crearSucursal
);

router.put('/:id',    validarJWT, tieneRol(2,3), actualizarSucursal);
router.delete('/:id', validarJWT, tieneRol(2,3), desactivarSucursal);

export default router;