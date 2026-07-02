import { Router } from 'express';
import { getCuentas, getCuentaById } from '../controllers/cuenta.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/',     validarJWT, getCuentas);
router.get('/:id',  validarJWT, getCuentaById);

export default router;