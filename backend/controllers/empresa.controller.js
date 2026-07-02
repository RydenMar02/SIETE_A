import Empresa from '../models/empresa.js';
import Periodo from '../models/periodo.js';
import SalaUsuario from '../models/salaUsuario.js';
import Cuenta from '../models/cuenta.js';
import EmpresaCuenta from '../models/empresaCuenta.js';

export const getEmpresas = async (req, res) => {
    const { desde = 0, limite = 10, id_sala } = req.query;
    const id_alumno = req.usuario.id_usuario;

    try {
        const whereSalaUsuario = { id_alumno };
        if (id_sala) whereSalaUsuario.id_sala = parseInt(id_sala);

        const [total, empresas] = await Promise.all([
            Empresa.count({
                where: { estado: 1 },
                include: [{ model: SalaUsuario, where: whereSalaUsuario }]
            }),
            Empresa.findAll({
                where: { estado: 1 },
                offset: parseInt(desde),
                limit: parseInt(limite),
                order: [['id_empresa', 'ASC']],
                include: [
                    {
                        model: SalaUsuario,
                        where: whereSalaUsuario,
                        attributes: ['idsala_usuario']
                    },
                    {
                        model: Periodo,
                        attributes: ['periodo']
                    }
                ]
            })
        ]);

        if (total === 0) {
            return res.status(404).json({ msg: 'No tenés empresas registradas, creá una' });
        }

        res.json({ total, empresas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener empresas' });
    }
};

export const getEmpresaById = async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id, {
            include: [
                { model: Periodo, attributes: ['periodo'] },
                { model: SalaUsuario, attributes: ['idsala_usuario'] }
            ]
        });
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }
        res.json(empresa);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener empresa' });
    }
};

export const getEmpresasPorSalaUsuario = async (req, res) => {
    const { desde = 0, limite = 10, id_salausuario } = req.query;

    try {
        const whereSalaUsuario = {};
        if (id_salausuario) whereSalaUsuario.idsala_usuario = parseInt(id_salausuario);

        const [total, empresas] = await Promise.all([
            Empresa.count({
                where: { estado: 1 },
                include: [{ model: SalaUsuario, where: whereSalaUsuario }]
            }),
            Empresa.findAll({
                where: { estado: 1 },
                offset: parseInt(desde),
                limit: parseInt(limite),
                order: [['id_empresa', 'ASC']],
                include: [
                    { model: SalaUsuario, where: whereSalaUsuario, attributes: ['idsala_usuario'] },
                    { model: Periodo, attributes: ['periodo'] }
                ]
            })
        ]);

        if (total === 0) {
            return res.status(404).json({ msg: 'No hay empresas en esta sala' });
        }

        res.json({ total, empresas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener empresas' });
    }
};

export const crearEmpresa = async (req, res) => {
    const { nombre, ruc, sigla, id_periodo, id_salausuario } = req.body;

    try {
        const empresa = await Empresa.create({
            nombre,
            ruc,
            sigla,
            id_periodo,
            id_salausuario,
            estado: 1
        });

        // Copiar todas las cuentas por defecto a la empresa
        const cuentasPorDefecto = await Cuenta.findAll({
            where: { pordefecto: 1 }
        });

        const empresaCuentas = cuentasPorDefecto.map(cuenta => ({
            id_empresa: empresa.id_empresa,
            id_cuenta: cuenta.id_cuenta,
            nombre: cuenta.nombre,
            nombre_alternativo: cuenta.nombre_alternativo,
            codigo: cuenta.codigo,
            asentable: cuenta.asentable,
            naturaleza: cuenta.naturaleza,
            moneda: cuenta.moneda,
            id_padre: cuenta.id_padre,
            nivel: cuenta.nivel,
            pordefecto: cuenta.pordefecto,
            estado: 1
        }));

        await EmpresaCuenta.bulkCreate(empresaCuentas);

        res.status(201).json({
            msg: 'Empresa creada correctamente',
            empresa
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear empresa' });
    }
};

export const actualizarEmpresa = async (req, res) => {
    const { id } = req.params;
    const { nombre, ruc, sigla, id_periodo } = req.body;

    try {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }
        await empresa.update({ nombre, ruc, sigla, id_periodo });
        res.json({ msg: 'Empresa actualizada', empresa });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar empresa' });
    }
};

export const desactivarEmpresa = async (req, res) => {
    const { id } = req.params;

    try {
        const empresa = await Empresa.findByPk(id);
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }
        await empresa.update({ estado: 0 });
        res.json({ msg: 'Empresa desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar empresa' });
    }
};