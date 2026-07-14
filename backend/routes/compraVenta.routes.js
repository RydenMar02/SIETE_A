import { Router } from 'express';
import { body } from 'express-validator';
import {
    getComprasVentas,
    getCompraVentaById,
    crearCompraVenta,
    actualizarCompraVenta,
    desactivarCompraVenta
} from '../controllers/compraVenta.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',     validarJWT, tieneRol(2, 3), getComprasVentas);
router.get('/:id',  validarJWT, tieneRol(2, 3), getCompraVentaById);

router.post('/',
    validarJWT,
    tieneRol(3),
    [
        body('tipo').isIn(['COMPRA', 'VENTA']).withMessage('El tipo debe ser COMPRA o VENTA'),
        body('id_sucursal').notEmpty().withMessage('La sucursal es obligatoria'),
        body('id_clienteproveedor').notEmpty().withMessage('El cliente/proveedor es obligatorio'),
        body('numero_factura').notEmpty().withMessage('El número de factura es obligatorio'),
        body('numero_timbrado').isInt().withMessage('El timbrado debe ser numérico'),
        body('tipo_de_factura').notEmpty().withMessage('El tipo de factura es obligatorio'),
        body('condicion').isIn(['CONTADO', 'CREDITO']).withMessage('La condición debe ser CONTADO o CREDITO'),
        body('fecha').notEmpty().withMessage('La fecha es obligatoria'),
        body('total_factura').isDecimal().withMessage('El total debe ser un número'),
        body('moneda').isIn(['LOCAL', 'EXTRANJERA']).withMessage('La moneda debe ser LOCAL o EXTRANJERA'),
        body('concepto').notEmpty().withMessage('El concepto es obligatorio'),
        body('fecha_vencimiento').notEmpty().withMessage('La fecha de vencimiento es obligatoria'),
        validar
    ],
    crearCompraVenta
);

router.put('/:id',    validarJWT, tieneRol(3), actualizarCompraVenta);
router.delete('/:id', validarJWT, tieneRol(3), desactivarCompraVenta);

export default router;