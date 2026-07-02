import Usuario from '../models/usuario.js';
import Rol from '../models/rol.js';
import { hashPassword, compararPassword } from '../helpers/bcrypt.js';

export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['contra'] },
            include: { model: Rol, attributes: ['rol'] }
        });
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener usuarios' });
    }
};

export const getUsuarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['contra'] },
            include: { model: Rol, attributes: ['rol'] }
        });
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener usuario' });
    }
};

export const crearUsuario = async (req, res) => {
    try {
        const { nombre, cedula, correo, contra, telefono, id_rol } = req.body;

        const existe = await Usuario.findOne({ where: { cedula } });
        if (existe) {
            return res.status(400).json({ msg: 'Ya existe un usuario con esa cédula' });
        }

        const hash = hashPassword(contra);

        const usuario = await Usuario.create({
            nombre,
            cedula,
            correo,
            contra: hash,
            telefono,
            id_rol
        });

        res.status(201).json({
            msg: 'Usuario creado',
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
        res.status(500).json({ msg: 'Error al crear usuario' });
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, cedula, correo, telefono, id_rol, contra } = req.body;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const data = { nombre, cedula, correo, telefono, id_rol };

        if (contra) {
            data.contra = hashPassword(contra);
        }

        await usuario.update(data);
        res.json({ msg: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar usuario' });
    }
};

export const desactivarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        await usuario.update({ estado: 0 });
        res.json({ msg: 'Usuario desactivado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar usuario' });
    }
};