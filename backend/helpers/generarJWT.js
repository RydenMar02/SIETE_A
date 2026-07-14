import jwt from 'jsonwebtoken';

export const generarJWT = (payload) => {
    try {
        return jwt.sign(payload, process.env.SECRETORPRIVATEKEY, {
            expiresIn: '8h'
        });
    } catch (error) {
        console.error(error);
        throw new Error('Error al generar JWT');
    }
};