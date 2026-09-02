import { Router } from 'express';
import {
    getMensajesRecibidos,
    getConversacion,
    marcarTodosLeidos
} from '../controllers/mensaje.controller.js';
import { validarJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/recibidos',      validarJWT, getMensajesRecibidos);
router.get('/conversacion',   validarJWT, getConversacion);
router.patch('/marcar-leidos', validarJWT, marcarTodosLeidos);

export default router;