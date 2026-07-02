import Sucursal from '../models/sucursal.js';

export const getSucursales = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        const where = { estado: 1 };
        if (id_empresa) where.id_empresa = parseInt(id_empresa);

        const sucursales = await Sucursal.findAll({
            where,
            order: [['codigo', 'ASC']]
        });

        res.json({ total: sucursales.length, sucursales });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener sucursales' });
    }
};

export const getSucursalById = async (req, res) => {
    const { id } = req.params;

    try {
        const sucursal = await Sucursal.findByPk(id);
        if (!sucursal) {
            return res.status(404).json({ msg: 'Sucursal no encontrada' });
        }
        res.json(sucursal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener sucursal' });
    }
};

export const crearSucursal = async (req, res) => {
    const { id_empresa, codigo, nombre, telefono, responsable } = req.body;

    try {
        const existe = await Sucursal.findOne({ where: { id_empresa, codigo } });
        if (existe) {
            return res.status(400).json({ msg: 'Ya existe una sucursal con ese código en esta empresa' });
        }

        const sucursal = await Sucursal.create({
            id_empresa,
            codigo,
            nombre,
            telefono,
            responsable,
            estado: 1
        });

        res.status(201).json({ msg: 'Sucursal creada', sucursal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear sucursal' });
    }
};

export const actualizarSucursal = async (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, telefono, responsable } = req.body;

    try {
        const sucursal = await Sucursal.findByPk(id);
        if (!sucursal) {
            return res.status(404).json({ msg: 'Sucursal no encontrada' });
        }
        await sucursal.update({ codigo, nombre, telefono, responsable });
        res.json({ msg: 'Sucursal actualizada', sucursal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar sucursal' });
    }
};

export const desactivarSucursal = async (req, res) => {
    const { id } = req.params;

    try {
        const sucursal = await Sucursal.findByPk(id);
        if (!sucursal) {
            return res.status(404).json({ msg: 'Sucursal no encontrada' });
        }
        await sucursal.update({ estado: 0 });
        res.json({ msg: 'Sucursal desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar sucursal' });
    }
};