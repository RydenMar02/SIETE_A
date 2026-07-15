import { Router } from 'express';
import { body } from 'express-validator';
import {
    getClientesProveedores,
    getClienteProveedorById,
    crearClienteProveedor,
    actualizarClienteProveedor,
    desactivarClienteProveedor
} from '../controllers/clienteProveedor.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',     validarJWT, tieneRol(2, 3), getClientesProveedores);
router.get('/:id',  validarJWT, tieneRol(2, 3), getClienteProveedorById);

router.post('/',
    validarJWT,
    tieneRol(2,3),
    [
        body('id_empresa').notEmpty().withMessage('La empresa es obligatoria'),
        body('id_ciudad').notEmpty().withMessage('La ciudad es obligatoria'),
        body('tipo').isIn(['CLIENTE', 'PROVEEDOR']).withMessage('El tipo debe ser CLIENTE o PROVEEDOR'),
        body('tipo_documento').isIn(['RUC', 'CI', 'PASAPORTE', 'DNI', 'RIF', 'NO_RESIDENTE']).withMessage('Tipo de documento inválido'),
        body('tipo_contribuyente').isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA', 'NO_CONTRIBUYENTE', 'JURIDICA_ESTADO']).withMessage('Tipo de contribuyente inválido'),
        body('razon_social').notEmpty().withMessage('La razón social es obligatoria'),
        body('numero_identificacion').notEmpty().withMessage('El número de identificación es obligatorio'),
        validar
    ],
    crearClienteProveedor
);

router.put('/:id',
    validarJWT,
    tieneRol(2,3),
    [
        body('tipo').isIn(['CLIENTE', 'PROVEEDOR']).withMessage('El tipo debe ser CLIENTE o PROVEEDOR'),
        body('tipo_documento').isIn(['RUC', 'CI', 'PASAPORTE', 'DNI', 'RIF', 'NO_RESIDENTE']).withMessage('Tipo de documento inválido'),
        body('tipo_contribuyente').isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA', 'NO_CONTRIBUYENTE', 'JURIDICA_ESTADO']).withMessage('Tipo de contribuyente inválido'),
        body('razon_social').notEmpty().withMessage('La razón social es obligatoria'),
        body('numero_identificacion').notEmpty().withMessage('El número de identificación es obligatorio'),
        validar
    ],
    actualizarClienteProveedor
);

router.delete('/:id', validarJWT, tieneRol(2,3), desactivarClienteProveedor);

export default router;