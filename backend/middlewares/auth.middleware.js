import jwt from 'jsonwebtoken';

export const validarJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ msg: 'No hay token en la petición' });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'Formato de token inválido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.SECRETORPRIVATEKEY);
        req.usuario = payload;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Token no válido' });
    }
};