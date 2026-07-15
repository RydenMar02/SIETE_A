import EmpresaCuenta from '../models/empresaCuenta.js';

export const getEmpresaCuentas = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        const cuentas = await EmpresaCuenta.findAll({
            where: { id_empresa: parseInt(id_empresa), estado: 1 },
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

export const getCuentaByCode = async (req, res) => {
    const { codigo } = req.params;
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        const cuenta = await EmpresaCuenta.findOne({
            where: {
                id_empresa: parseInt(id_empresa),
                codigo,
                estado: 1
            },
            attributes: ['id_empresacuenta', 'id_cuenta', 'nombre', 'codigo', 'nivel', 'id_padre', 'id_empresa']
        });

        if (!cuenta) {
            return res.status(404).json({ msg: `No se encontró cuenta con código ${codigo} para la empresa ${id_empresa}` });
        }

        res.json(cuenta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener la cuenta contable' });
    }
};
// Filtrar por nivel y padre — igual que el proyecto anterior
export const getCuentasPorNivelYPadre = async (req, res) => {
    try {
        let { nivel, id_padre, id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        const where = {
            estado: 1,
            id_empresa: parseInt(id_empresa)
        };

        if (nivel) {
            where.nivel = parseInt(nivel);
        }

        if (id_padre !== undefined && id_padre !== null && id_padre !== '' && id_padre !== 'null') {
            where.id_padre = parseInt(id_padre);
        } else {
            where.id_padre = null;
        }

        const cuentas = await EmpresaCuenta.findAll({
            where,
            attributes: ['id_empresacuenta', 'id_cuenta', 'nombre', 'codigo', 'nivel', 'id_padre', 'id_empresa'],
            order: [['codigo', 'ASC']]
        });

        res.json({ cuentas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuentas filtradas' });
    }
};

// Estructura jerárquica de cuentas — igual que el proyecto anterior
export const getEstructuraCuentas = async (req, res) => {
    try {
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        const empresaId = parseInt(id_empresa);

        const whereEmpresa = { id_empresa: empresaId };

        const cuentasRaiz = await EmpresaCuenta.findAll({
            where: { ...whereEmpresa, id_padre: null },
            include: [
                {
                    model: EmpresaCuenta,
                    as: 'cuentasHijas',
                    required: false,
                    where: whereEmpresa,
                    include: [
                        {
                            model: EmpresaCuenta,
                            as: 'cuentasHijas',
                            required: false,
                            where: whereEmpresa,
                            include: [
                                {
                                    model: EmpresaCuenta,
                                    as: 'cuentasHijas',
                                    required: false,
                                    where: whereEmpresa,
                                    include: [
                                        {
                                            model: EmpresaCuenta,
                                            as: 'cuentasHijas',
                                            required: false,
                                            where: whereEmpresa
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['codigo', 'ASC']]
        });

        res.json(cuentasRaiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener estructura de cuentas' });
    }
};

// Crear cuenta nueva dentro de la empresa
export const crearEmpresaCuenta = async (req, res) => {
    try {
        const { codigo, id_padre, id_empresa, nombre, nombre_alternativo, naturaleza, moneda, asentable } = req.body;

        let nivel = 1;

        if (id_padre) {
            const cuentaPadre = await EmpresaCuenta.findByPk(id_padre);
            if (!cuentaPadre) {
                return res.status(400).json({ msg: `La cuenta padre con id ${id_padre} no existe` });
            }
            nivel = cuentaPadre.nivel + 1;
        }

        const cuenta = await EmpresaCuenta.create({
            codigo,
            nombre,
            nombre_alternativo: nombre_alternativo || '',
            id_padre: id_padre || null,
            naturaleza,
            moneda: moneda || 'LOCAL',
            asentable,
            nivel,
            id_empresa,
            id_cuenta: 0,
            pordefecto: 0,
            estado: 1
        });

        res.status(201).json({ msg: 'Cuenta creada correctamente', cuenta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear cuenta' });
    }
};

export const actualizarEmpresaCuenta = async (req, res) => {
    const { id } = req.params;
    const { nombre, nombre_alternativo, codigo, asentable, naturaleza, moneda, nivel, estado } = req.body;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }

        await cuenta.update({ nombre, nombre_alternativo, codigo, asentable, naturaleza, moneda, nivel, estado });
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

        const tieneHijas = await EmpresaCuenta.findOne({ where: { id_padre: id, estado: 1 } });
        if (tieneHijas) {
            return res.status(400).json({ msg: 'No se puede eliminar la cuenta porque tiene cuentas hijas asociadas' });
        }

        await cuenta.update({ estado: 0 });
        res.json({ msg: 'Cuenta desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar cuenta' });
    }
};