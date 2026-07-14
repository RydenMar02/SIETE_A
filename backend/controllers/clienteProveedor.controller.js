import ClienteProveedor from '../models/clienteProveedor.js';
import Empresa from '../models/empresa.js';
import Ciudad from '../models/ciudad.js';

export const getClientesProveedores = async (req, res) => {
    const { desde = 0, limite = 10, tipo, id_empresa } = req.query;

    try {
        const where = { estado: 1 };
        if (id_empresa) where.id_empresa = parseInt(id_empresa);
        if (tipo && ['CLIENTE', 'PROVEEDOR'].includes(tipo.toUpperCase())) {
            where.tipo = tipo.toUpperCase();
        }

        const [total, registros] = await Promise.all([
            ClienteProveedor.count({ where }),
            ClienteProveedor.findAll({
                where,
                offset: parseInt(desde),
                limit: parseInt(limite),
                order: [['id_clienteproveedor', 'ASC']],
                include: [
                    { model: Empresa, attributes: ['id_empresa', 'nombre'] },
                    { model: Ciudad, attributes: ['id_ciudad', 'nombre'] }
                ]
            })
        ]);

        res.json({ total, registros });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener clientes/proveedores' });
    }
};

export const getClienteProveedorById = async (req, res) => {
    const { id } = req.params;

    try {
        const registro = await ClienteProveedor.findByPk(id, {
            include: [
                { model: Empresa, attributes: ['id_empresa', 'nombre'] },
                { model: Ciudad, attributes: ['id_ciudad', 'nombre'] }
            ]
        });
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }
        res.json(registro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener registro' });
    }
};

export const crearClienteProveedor = async (req, res) => {
    const {
        id_empresa,
        id_ciudad,
        tipo,
        tipo_documento,
        tipo_contribuyente,
        razon_social,
        numero_identificacion,
        direccion,
        telefono,
        correo
    } = req.body;

    try {
        const nuevo = await ClienteProveedor.create({
            id_empresa,
            id_ciudad,
            tipo: tipo.toUpperCase(),
            tipo_documento,
            tipo_contribuyente,
            razon_social,
            numero_identificacion,
            direccion,
            telefono,
            correo,
            estado: 1
        });

        res.status(201).json({ msg: 'Registro creado', registro: nuevo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear registro' });
    }
};

export const actualizarClienteProveedor = async (req, res) => {
    const { id } = req.params;
    const {
        id_ciudad,
        tipo,
        tipo_documento,
        tipo_contribuyente,
        razon_social,
        numero_identificacion,
        direccion,
        telefono,
        correo
    } = req.body;

    try {
        const registro = await ClienteProveedor.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        await registro.update({
            id_ciudad,
            tipo: tipo?.toUpperCase(),
            tipo_documento,
            tipo_contribuyente,
            razon_social,
            numero_identificacion,
            direccion,
            telefono,
            correo
        });

        res.json({ msg: 'Registro actualizado', registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar registro' });
    }
};

export const desactivarClienteProveedor = async (req, res) => {
    const { id } = req.params;

    try {
        const registro = await ClienteProveedor.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }
        await registro.update({ estado: 0 });
        res.json({ msg: 'Registro desactivado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar registro' });
    }
};