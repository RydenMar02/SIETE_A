import { Op } from 'sequelize';
import db from '../db/conexion.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import Empresa from '../models/empresa.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import CompraVenta from '../models/compraVenta.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';

const includeCompleto = [
    { model: Empresa, as: 'empresa', attributes: ['nombre'] },
    { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
    {
        model: AsientoDetalle,
        as: 'asientoDetalles',
        include: [{
            model: EmpresaCuenta,
            as: 'empresaCuenta',
            attributes: ['id_empresacuenta', 'codigo', 'nombre', 'nombre_alternativo', 'naturaleza', 'asentable']
        }]
    }
];

export const getAsientos = async (req, res) => {
    let { desde = 0, limite = 10, id_empresa, estado, fecha_desde, fecha_hasta } = req.query;

    if (!id_empresa) {
        return res.status(400).json({ msg: 'id_empresa es obligatorio' });
    }
    id_empresa = parseInt(id_empresa);

    try {
        if (!(await puedeAccederAEmpresa(req, id_empresa))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los asientos de esta empresa' });
        }

        const where = { id_empresa };
        if (estado) where.estado = estado;
        if (fecha_desde && fecha_hasta) {
            where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
        }

        const [total, asientos] = await Promise.all([
            AsientoCabecera.count({ where }),
            AsientoCabecera.findAll({
                where,
                offset: parseInt(desde),
                limit: parseInt(limite),
                include: includeCompleto,
                order: [['fecha', 'DESC'], ['numero_asiento', 'DESC']]
            })
        ]);

        res.json({ total, asientos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener asientos' });
    }
};

export const getAsientoById = async (req, res) => {
    const { id } = req.params;

    try {
        const asiento = await AsientoCabecera.findByPk(id, {
            include: includeCompleto
        });

        if (!asiento) {
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        res.json(asiento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener asiento' });
    }
};

export const getNumerosAsientos = async (req, res) => {
    const { id_empresa } = req.query;

    if (!id_empresa) {
        return res.status(400).json({ msg: 'id_empresa es obligatorio' });
    }

    try {
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los asientos de esta empresa' });
        }

        const asientos = await AsientoCabecera.findAll({
            where: { id_empresa: parseInt(id_empresa) },
            attributes: ['numero_asiento'],
            order: [['fecha', 'DESC'], ['numero_asiento', 'DESC']]
        });

        res.json({ numeros: asientos.map(a => a.numero_asiento) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener números de asientos' });
    }
};

export const getResumenAsientos = async (req, res) => {
    const { id_empresa } = req.params;

    try {
        const resumen = await AsientoCabecera.findAll({
            where: { id_empresa },
            attributes: [
                'estado',
                [db.fn('COUNT', db.col('id_asiento')), 'cantidad'],
                [db.fn('SUM', db.col('total_debe')), 'total_debe'],
                [db.fn('SUM', db.col('total_haber')), 'total_haber']
            ],
            group: ['estado']
        });

        res.json(resumen);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener resumen' });
    }
};

export const crearAsiento = async (req, res) => {
    const transaction = await db.transaction();

    try {
        const { asientoDetalles, id_compraventa, ...cabecera } = req.body;

        // Verificar duplicado
        const existe = await AsientoCabecera.findOne({
            where: { id_empresa: cabecera.id_empresa, numero_asiento: cabecera.numero_asiento }
        });
        if (existe) {
            await transaction.rollback();
            return res.status(400).json({ msg: `Ya existe un asiento con el número ${cabecera.numero_asiento}` });
        }

        // Si el asiento viene de "cargar desde compra/venta", validar que
        // esa compra/venta exista, sea de esta empresa y no esté imputada ya
        let compraVenta = null;
        if (id_compraventa) {
            compraVenta = await CompraVenta.findByPk(id_compraventa, {
                include: [{ model: Sucursal, attributes: ['id_empresa'] }],
                transaction
            });
            if (!compraVenta) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'La compra/venta indicada no existe' });
            }
            if (compraVenta.Sucursal.id_empresa !== cabecera.id_empresa) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'La compra/venta indicada no pertenece a esta empresa' });
            }
            if (compraVenta.imputada === 'SI') {
                await transaction.rollback();
                return res.status(400).json({ msg: 'Esa compra/venta ya fue imputada en otro asiento' });
            }
        }

        // Validar cuentas asentables
        for (const detalle of asientoDetalles) {
            const cuenta = await EmpresaCuenta.findByPk(detalle.id_empresacuenta);
            if (!cuenta) {
                await transaction.rollback();
                return res.status(400).json({ msg: `No existe la cuenta con id ${detalle.id_empresacuenta}` });
            }
            if (cuenta.asentable.toUpperCase() !== 'SI') {
                await transaction.rollback();
                return res.status(400).json({ msg: `La cuenta "${cuenta.nombre}" no es asentable` });
            }
        }

        // Calcular totales
        const totalDebe = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.debe || 0), 0);
        const totalHaber = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.haber || 0), 0);

        // Validar balance
        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'El asiento no está balanceado. Debe = Haber' });
        }

        // Crear cabecera
        const nuevoCabecera = await AsientoCabecera.create({
            ...cabecera,
            total_debe: totalDebe,
            total_haber: totalHaber,
            diferencia: totalDebe - totalHaber,
            estado: 'pendiente'
        }, { transaction });

        // Crear detalles
        await AsientoDetalle.bulkCreate(
            asientoDetalles.map(d => ({ ...d, id_asiento: nuevoCabecera.id_asiento })),
            { transaction }
        );

        // Si vino de una compra/venta, marcarla como ya imputada
        if (compraVenta) {
            await compraVenta.update({ imputada: 'SI' }, { transaction });
        }

        await transaction.commit();

        const asientoCompleto = await AsientoCabecera.findByPk(nuevoCabecera.id_asiento, {
            include: includeCompleto
        });

        res.status(201).json({ msg: 'Asiento creado', asiento: asientoCompleto });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: 'Error al crear asiento' });
    }
};

export const actualizarAsiento = async (req, res) => {
    const transaction = await db.transaction();
    const { id } = req.params;

    try {
        const { asientoDetalles, ...cabecera } = req.body;

        const asiento = await AsientoCabecera.findByPk(id);
        if (!asiento) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        if (asiento.estado === 'procesado') {
            await transaction.rollback();
            return res.status(400).json({ msg: 'No se puede modificar un asiento procesado' });
        }

        if (asientoDetalles && asientoDetalles.length > 0) {
            // Validar cuentas
            for (const detalle of asientoDetalles) {
                const cuenta = await EmpresaCuenta.findByPk(detalle.id_empresacuenta);
                if (!cuenta) {
                    await transaction.rollback();
                    return res.status(400).json({ msg: `No existe la cuenta con id ${detalle.id_empresacuenta}` });
                }
                if (cuenta.asentable.toUpperCase() !== 'SI') {
                    await transaction.rollback();
                    return res.status(400).json({ msg: `La cuenta "${cuenta.nombre}" no es asentable` });
                }
            }

            const totalDebe = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.debe || 0), 0);
            const totalHaber = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.haber || 0), 0);

            if (Math.abs(totalDebe - totalHaber) > 0.01) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'El asiento no está balanceado. Debe = Haber' });
            }

            await AsientoDetalle.destroy({ where: { id_asiento: id }, transaction });
            await AsientoDetalle.bulkCreate(
                asientoDetalles.map(d => ({ ...d, id_asiento: id })),
                { transaction }
            );

            cabecera.total_debe = totalDebe;
            cabecera.total_haber = totalHaber;
            cabecera.diferencia = totalDebe - totalHaber;
        }

        await asiento.update(cabecera, { transaction });
        await transaction.commit();

        const asientoActualizado = await AsientoCabecera.findByPk(id, { include: includeCompleto });
        res.json({ msg: 'Asiento actualizado', asiento: asientoActualizado });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar asiento' });
    }
};

export const eliminarAsiento = async (req, res) => {
    const transaction = await db.transaction();
    const { id } = req.params;

    try {
        const asiento = await AsientoCabecera.findByPk(id);
        if (!asiento) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        if (asiento.estado === 'procesado') {
            await transaction.rollback();
            return res.status(400).json({ msg: 'No se puede eliminar un asiento procesado' });
        }

        await asiento.destroy({ transaction });
        await transaction.commit();
        res.json({ msg: 'Asiento eliminado' });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar asiento' });
    }
};

export const procesarAsiento = async (req, res) => {
    const { id } = req.params;

    try {
        const asiento = await AsientoCabecera.findByPk(id);
        if (!asiento) {
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }
        if (asiento.estado === 'procesado') {
            return res.status(400).json({ msg: 'El asiento ya está procesado' });
        }
        if (Math.abs(parseFloat(asiento.diferencia)) > 0.01) {
            return res.status(400).json({ msg: 'No se puede procesar un asiento no balanceado' });
        }

        await asiento.update({ estado: 'procesado' });
        res.json({ msg: 'Asiento procesado', asiento });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al procesar asiento' });
    }
};

export const getDetallesPorAsiento = async (req, res) => {
    const { id } = req.params;

    try {
        const detalles = await AsientoDetalle.findAll({
            where: { id_asiento: id },
            include: [
                {
                    model: EmpresaCuenta,
                    as: 'empresaCuenta',
                    attributes: ['id_empresacuenta', 'codigo', 'nombre', 'nombre_alternativo', 'naturaleza', 'asentable', 'moneda']
                },
                {
                    model: AsientoCabecera,
                    as: 'asientoCabecera',
                    attributes: ['numero_asiento', 'fecha', 'concepto']
                }
            ],
            order: [['id_detalle', 'ASC']]
        });

        res.json({ total: detalles.length, detalles });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener detalles' });
    }
};