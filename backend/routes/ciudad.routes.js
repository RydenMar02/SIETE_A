import { Router } from 'express';
import { getCiudades, getCiudadById } from '../controllers/ciudad.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/',     validarJWT, getCiudades);
router.get('/:id',  validarJWT, getCiudadById);

export default router;