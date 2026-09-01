import { Router } from 'express';
import { 
  getTopSucursales, 
  getTopClientesPorSucursal, 
  getTopProveedoresPorSucursal 
} from '../controllers/graficos.controller.js';

import { check } from 'express-validator';
import { validar } from '../middlewares/validaciones.middleware.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.get(
  "/top-sucursales/:empresaId",
  [
    validarJWT,
    tieneRol(1, 2, 3),
    validar,
  ],
  getTopSucursales
);

router.get(
  "/top-clientes/:empresaId",
  [
    validarJWT,
    tieneRol(1, 2, 3),
    validar,
  ],
  getTopClientesPorSucursal
);

router.get(
  "/top-proveedores/:empresaId",
  [
    validarJWT,
    tieneRol(1, 2, 3),
    validar,
  ],
  getTopProveedoresPorSucursal
);

export default router;