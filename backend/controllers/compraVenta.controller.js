import CompraVenta from '../models/compraVenta.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';

export const getComprasVentas = async (req, res) => {
    const { desde = 0, limite = 10, tipo, id_empresa } = req.query;

    try {
        const where = { estado: 1 };
        if (tipo && ['COMPRA', 'VENTA'].includes(tipo.toUpperCase())) {
            where.tipo = tipo.toUpperCase();
        }

        const [total, registros] = await Promise.all([
            CompraVenta.count({
                where,
                include: [{
                    model: ClienteProveedor,
                    where: { id_empresa: parseInt(id_empresa) }
                }]
            }),
            CompraVenta.findAll({
                where,
                offset: parseInt(desde),
                limit: parseInt(limite),
                order: [['id_compraventa', 'ASC']],
                include: [
                    {
                        model: ClienteProveedor,
                        attributes: ['razon_social', 'numero_identificacion'],
                        where: { id_empresa: parseInt(id_empresa) }
                    },
                    { model: Sucursal, attributes: ['nombre'] },
                    { model: EmpresaCuenta, as: 'cuentaExenta', attributes: ['nombre', 'codigo'] },
                    { model: EmpresaCuenta, as: 'cuentaGrav10', attributes: ['nombre', 'codigo'] },
                    { model: EmpresaCuenta, as: 'cuentaGrav05', attributes: ['nombre', 'codigo'] }
                ]
            })
        ]);

        res.json({ total, registros });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener compras/ventas' });
    }
};

export const getCompraVentaById = async (req, res) => {
    const { id } = req.params;

    try {
        const registro = await CompraVenta.findByPk(id, {
            include: [
                {
                    model: ClienteProveedor,
                    attributes: ['razon_social', 'numero_identificacion']
                },
                { model: Sucursal, attributes: ['nombre'] },
                { model: EmpresaCuenta, as: 'cuentaExenta', attributes: ['nombre', 'codigo'] },
                { model: EmpresaCuenta, as: 'cuentaGrav10', attributes: ['nombre', 'codigo'] },
                { model: EmpresaCuenta, as: 'cuentaGrav05', attributes: ['nombre', 'codigo'] }
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

export const crearCompraVenta = async (req, res) => {
    try {
        const nuevo = await CompraVenta.create({
            ...req.body,
            tipo: req.body.tipo?.toUpperCase(),
            imputada: 'NO'
        });
        res.status(201).json({ msg: 'Registro creado', registro: nuevo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear registro' });
    }
};

export const actualizarCompraVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const registro = await CompraVenta.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        if (registro.imputada === 'SI') {
            return res.status(400).json({ msg: 'No se puede modificar una factura ya imputada' });
        }

        await registro.update(req.body);
        res.json({ msg: 'Registro actualizado', registro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar registro' });
    }
};

export const desactivarCompraVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const registro = await CompraVenta.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        if (registro.imputada === 'SI') {
            return res.status(400).json({ msg: 'No se puede eliminar una factura ya imputada' });
        }

        await registro.update({ estado: 0 });
        res.json({ msg: 'Registro desactivado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar registro' });
    }
};