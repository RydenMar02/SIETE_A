import { Router } from 'express';
import { getMovimientosPorSala } from '../controllers/movimiento.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.get('/', validarJWT, tieneRol(1, 2), getMovimientosPorSala);

export default router;