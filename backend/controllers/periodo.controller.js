import Periodo from '../models/periodo.js';

export const getPeriodos = async (req, res) => {
    try {
        const periodos = await Periodo.findAll();
        res.json(periodos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener periodos' });
    }
};

export const getPeriodoById = async (req, res) => {
    try {
        const { id } = req.params;
        const periodo = await Periodo.findByPk(id);
        if (!periodo) {
            return res.status(404).json({ msg: 'Periodo no encontrado' });
        }
        res.json(periodo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener periodo' });
    }
};

export const crearPeriodo = async (req, res) => {
    try {
        const { periodo } = req.body;
        const existe = await Periodo.findOne({ where: { periodo } });
        if (existe) {
            return res.status(400).json({ msg: 'El periodo ya existe' });
        }
        const nuevo = await Periodo.create({ periodo });
        res.status(201).json({ msg: 'Periodo creado', periodo: nuevo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear periodo' });
    }
};

export const actualizarPeriodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { periodo } = req.body;
        const registro = await Periodo.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Periodo no encontrado' });
        }
        await registro.update({ periodo });
        res.json({ msg: 'Periodo actualizado', periodo: registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar periodo' });
    }
};

export const eliminarPeriodo = async (req, res) => {
    try {
        const { id } = req.params;
        const periodo = await Periodo.findByPk(id);
        if (!periodo) {
            return res.status(404).json({ msg: 'Periodo no encontrado' });
        }
        await periodo.destroy();
        res.json({ msg: 'Periodo eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar periodo' });
    }
};