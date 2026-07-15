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
    validar,
  ],
  getTopSucursales
);

router.get(
  "/top-clientes/:empresaId",
  [
    validar,
  ],
  getTopClientesPorSucursal
);

router.get(
  "/top-proveedores/:empresaId",
  [
    validar,
  ],
  getTopProveedoresPorSucursal
);

export default router;