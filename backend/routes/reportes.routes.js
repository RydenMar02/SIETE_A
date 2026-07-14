import { Router } from 'express';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

import { getAsientosPorEmpresa, reporteAsientosPDF } from '../controllers/reportesAsientos.controller.js';
import { getBalanceSumas, reporteBalanceSumasPDF } from '../controllers/reportesBalanceSumas.controller.js';
import { getClientesPorEmpresa, reporteClientesPDF } from '../controllers/reportesClientes.controller.js';
import { getProveedoresPorEmpresa, reporteProveedoresPDF } from '../controllers/reportesProveedores.controller.js';
import { getComprasPorEmpresa, reporteComprasPDF } from '../controllers/reportesCompras.controller.js';
import { getVentasPorEmpresa, reporteVentasPDF } from '../controllers/reportesVentas.controller.js';
import { getLibroDiario, reporteLibroDiarioPDF } from '../controllers/reportesLibroDiario.controller.js';
import { getLibroMayor, reporteLibroMayorPDF } from '../controllers/reportesLibroMayor.controller.js';

const router = Router();

// Asientos
router.get('/asientos',              validarJWT, tieneRol(2, 3), getAsientosPorEmpresa);
router.get('/asientos/pdf',          validarJWT, tieneRol(2, 3), reporteAsientosPDF);

// Balance de sumas y saldos
router.get('/balance-sumas',         validarJWT, tieneRol(2, 3), getBalanceSumas);
router.get('/balance-sumas/pdf',     validarJWT, tieneRol(2, 3), reporteBalanceSumasPDF);

// Clientes
router.get('/clientes',              validarJWT, tieneRol(2, 3), getClientesPorEmpresa);
router.get('/clientes/pdf',          validarJWT, tieneRol(2, 3), reporteClientesPDF);

// Proveedores
router.get('/proveedores',           validarJWT, tieneRol(2, 3), getProveedoresPorEmpresa);
router.get('/proveedores/pdf',       validarJWT, tieneRol(2, 3), reporteProveedoresPDF);

// Compras
router.get('/compras',               validarJWT, tieneRol(2, 3), getComprasPorEmpresa);
router.get('/compras/pdf',           validarJWT, tieneRol(2, 3), reporteComprasPDF);

// Ventas
router.get('/ventas',                validarJWT, tieneRol(2, 3), getVentasPorEmpresa);
router.get('/ventas/pdf',            validarJWT, tieneRol(2, 3), reporteVentasPDF);

// Libro Diario
router.get('/libro-diario',          validarJWT, tieneRol(2, 3), getLibroDiario);
router.get('/libro-diario/pdf',      validarJWT, tieneRol(2, 3), reporteLibroDiarioPDF);

// Libro Mayor
router.get('/libro-mayor',           validarJWT, tieneRol(2, 3), getLibroMayor);
router.get('/libro-mayor/pdf',       validarJWT, tieneRol(2, 3), reporteLibroMayorPDF);

export default router;