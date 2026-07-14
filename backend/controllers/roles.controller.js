import Rol from '../models/rol.js';

export const getRoles = async (req, res) => {
    try {
        const roles = await Rol.findAll();
        res.json(roles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener roles' });
    }
};

export const getRolById = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ msg: 'Rol no encontrado' });
        }
        res.json(rol);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener rol' });
    }
};

export const crearRol = async (req, res) => {
    try {
        const { rol } = req.body;
        const existe = await Rol.findOne({ where: { rol } });
        if (existe) {
            return res.status(400).json({ msg: 'El rol ya existe' });
        }
        const nuevoRol = await Rol.create({ rol });
        res.status(201).json({ msg: 'Rol creado', rol: nuevoRol });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear rol' });
    }
};

export const actualizarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;
        const registro = await Rol.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Rol no encontrado' });
        }
        await registro.update({ rol });
        res.json({ msg: 'Rol actualizado', rol: registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar rol' });
    }
};

export const eliminarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await Rol.findByPk(id);
        if (!rol) {
            return res.status(404).json({ msg: 'Rol no encontrado' });
        }
        await rol.destroy();
        res.json({ msg: 'Rol eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar rol' });
    }
};