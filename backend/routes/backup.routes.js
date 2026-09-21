import { Router } from 'express';
import { generarBackup } from '../controllers/backup.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';
import { tieneRol } from '../middlewares/roles.middleware.js';

const router = Router();

router.get('/', validarJWT, tieneRol(1), generarBackup);

export default router;