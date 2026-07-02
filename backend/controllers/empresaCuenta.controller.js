import EmpresaCuenta from '../models/empresaCuenta.js';

export const getEmpresaCuentas = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        const cuentas = await EmpresaCuenta.findAll({
            where: {
                id_empresa: parseInt(id_empresa),
                estado: 1
            },
            order: [['codigo', 'ASC']]
        });

        if (cuentas.length === 0) {
            return res.status(404).json({ msg: 'No hay cuentas registradas para esta empresa' });
        }

        res.json({ total: cuentas.length, cuentas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuentas' });
    }
};

export const getEmpresaCuentaById = async (req, res) => {
    const { id } = req.params;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }
        res.json(cuenta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuenta' });
    }
};

export const actualizarEmpresaCuenta = async (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        nombre_alternativo,
        codigo,
        asentable,
        naturaleza,
        moneda,
        nivel,
        estado
    } = req.body;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }

        await cuenta.update({
            nombre,
            nombre_alternativo,
            codigo,
            asentable,
            naturaleza,
            moneda,
            nivel,
            estado
        });

        res.json({ msg: 'Cuenta actualizada', cuenta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar cuenta' });
    }
};

export const desactivarEmpresaCuenta = async (req, res) => {
    const { id } = req.params;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }
        await cuenta.update({ estado: 0 });
        res.json({ msg: 'Cuenta desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar cuenta' });
    }
};