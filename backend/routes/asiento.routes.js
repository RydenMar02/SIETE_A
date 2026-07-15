import { Router } from 'express';
import { body, check } from 'express-validator';
import {
    getAsientos,
    getAsientoById,
    getNumerosAsientos,
    getResumenAsientos,
    crearAsiento,
    actualizarAsiento,
    eliminarAsiento,
    procesarAsiento,
    getDetallesPorAsiento
} from '../controllers/asiento.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';
import { validar } from '../middlewares/validaciones.middleware.js';

const router = Router();

router.get('/',                    validarJWT, tieneRol(2, 3), getAsientos);
router.get('/numeros',             validarJWT, tieneRol(2, 3), getNumerosAsientos);
router.get('/resumen/:id_empresa', validarJWT, tieneRol(2, 3), getResumenAsientos);
router.get('/:id',                 validarJWT, tieneRol(2, 3), getAsientoById);
router.get('/:id/detalles',        validarJWT, tieneRol(2, 3), getDetallesPorAsiento);

router.post('/',
    validarJWT,
    tieneRol(2,3),
    [
        body('id_empresa').notEmpty().withMessage('La empresa es obligatoria'),
        body('id_sucursal').notEmpty().withMessage('La sucursal es obligatoria'),
        body('tipo_asiento').isIn(['MANUAL', 'COMPRA', 'VENTA', 'AJUSTE']).withMessage('Tipo de asiento inválido'),
        body('numero_asiento').notEmpty().withMessage('El número de asiento es obligatorio'),
        body('fecha').isISO8601().withMessage('La fecha es obligatoria'),
        body('concepto').notEmpty().withMessage('El concepto es obligatorio'),
        body('asientoDetalles').isArray({ min: 1 }).withMessage('Debe tener al menos un detalle'),
        validar
    ],
    crearAsiento
);

router.put('/:id',    validarJWT, tieneRol(2,3), actualizarAsiento);
router.delete('/:id', validarJWT, tieneRol(2,3), eliminarAsiento);
router.patch('/:id/procesar', validarJWT, tieneRol(2,3), procesarAsiento);

export default router;