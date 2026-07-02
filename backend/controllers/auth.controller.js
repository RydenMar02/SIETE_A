import Usuario from '../models/usuario.js';
import Rol from '../models/rol.js';
import { hashPassword, compararPassword } from '../helpers/bcrypt.js';
import { generarJWT } from '../helpers/generarJWT.js';

export const login = async (req, res) => {
    try {
        const { cedula, contra } = req.body;

        const usuario = await Usuario.findOne({
            where: { cedula },
            include: { model: Rol, attributes: ['rol'] }
        });

        if (!usuario) {
            return res.status(400).json({ msg: 'Credenciales incorrectas' });
        }

        if (!usuario.estado) {
            return res.status(400).json({ msg: 'Usuario inactivo' });
        }

        const validPassword = compararPassword(contra, usuario.contra);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Credenciales incorrectas' });
        }

        const token = generarJWT({
            id_usuario: usuario.id_usuario,
            id_rol: usuario.id_rol,
            nombre: usuario.nombre
        });

        res.json({
            msg: 'Login correcto',
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                cedula: usuario.cedula,
                correo: usuario.correo,
                telefono: usuario.telefono,
                id_rol: usuario.id_rol,
                rol: usuario.Rol.rol
            },
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error en el login' });
    }
};

export const register = async (req, res) => {
    try {
        const { nombre, cedula, correo, telefono, id_rol } = req.body;

        const existe = await Usuario.findOne({ where: { cedula } });
        if (existe) {
            return res.status(400).json({ msg: 'Ya existe un usuario con esa cédula' });
        }

        const hash = hashPassword('12345678');

        const usuario = await Usuario.create({
            nombre,
            cedula,
            correo,
            contra: hash,
            telefono,
            id_rol
        });

        res.status(201).json({
            msg: 'Usuario registrado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                cedula: usuario.cedula,
                correo: usuario.correo,
                telefono: usuario.telefono,
                id_rol: usuario.id_rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error en el registro' });
    }
};