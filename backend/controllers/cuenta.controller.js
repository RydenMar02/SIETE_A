import Cuenta from '../models/cuenta.js';

export const getCuentas = async (req, res) => {
    try {
        const cuentas = await Cuenta.findAll({
            where: { estado: 1 },
            order: [['codigo', 'ASC']]
        });
        res.json(cuentas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuentas' });
    }
};

export const getCuentaById = async (req, res) => {
    try {
        const { id } = req.params;
        const cuenta = await Cuenta.findByPk(id, {
            include: {
                model: Cuenta,
                as: 'cuentasHijas',
                attributes: ['id_cuenta', 'nombre', 'codigo']
            }
        });
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }
        res.json(cuenta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuenta' });
    }
};