import Ciudad from '../models/ciudad.js';

export const getCiudades = async (req, res) => {
    try {
        const ciudades = await Ciudad.findAll();
        res.json(ciudades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener ciudades' });
    }
};

export const getCiudadById = async (req, res) => {
    try {
        const { id } = req.params;
        const ciudad = await Ciudad.findByPk(id);
        if (!ciudad) {
            return res.status(404).json({ msg: 'Ciudad no encontrada' });
        }
        res.json(ciudad);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener ciudad' });
    }
};