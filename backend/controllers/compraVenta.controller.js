import CompraVenta from '../models/compraVenta.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import db from '../db/conexion.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';

// Códigos del plan de cuentas estándar usados para resolver la cuenta de
// contrapartida y la de IVA, que no vienen elegidas por el usuario en el
// formulario de compra/venta (a diferencia de cuentaExenta/Grav10/Grav05,
// que sí las elige él). Si tu plan de cuentas usa otros códigos para estas
// cuentas, ajustá estas constantes.
const CODIGO_CAJA = '1.1.1.2';
const CODIGO_PROVEEDORES_LOCALES = '2.1.1.1';
const CODIGO_DEUDORES_VENTAS = '1.1.3.1';
const CODIGO_IVA_CREDITO_FISCAL = '1.1.3.5.3';
const CODIGO_IVA_A_PAGAR = '2.1.3.1.2';

const buscarCuentaPorCodigo = async (id_empresa, codigo, transaction) => {
    return EmpresaCuenta.findOne({
        where: { id_empresa, codigo, estado: 1 },
        transaction
    });
};

/**
 * Arma los detalles (debe/haber) del asiento contable a partir de una
 * compra/venta, resolviendo la cuenta de contrapartida (caja, proveedores
 * o deudores) y la de IVA según el tipo y la condición de pago.
 */
const armarDetallesAsiento = async (compraVenta, id_empresa, transaction) => {
    const detalles = [];
    const esCompra = compraVenta.tipo === 'COMPRA';
    const ladoLineasDeConcepto = esCompra ? 'debe' : 'haber'; // exenta/grav10/grav05
    const ladoIva = esCompra ? 'debe' : 'haber';
    const ladoContrapartida = esCompra ? 'haber' : 'debe';

    // Líneas por exenta / gravada 10% / gravada 5%, con las cuentas que el
    // usuario ya eligió al cargar la compra/venta.
    const lineasConcepto = [
        { id_empresacuenta: compraVenta.id_cuentaexenta, monto: parseFloat(compraVenta.exenta) },
        { id_empresacuenta: compraVenta.id_cuentagrav10, monto: parseFloat(compraVenta.base_imp_iva_10) },
        { id_empresacuenta: compraVenta.id_cuentagrav05, monto: parseFloat(compraVenta.base_imp_iva_05) },
    ];
    for (const linea of lineasConcepto) {
        if (linea.id_empresacuenta && linea.monto > 0) {
            detalles.push({
                id_empresacuenta: linea.id_empresacuenta,
                debe: ladoLineasDeConcepto === 'debe' ? linea.monto : 0,
                haber: ladoLineasDeConcepto === 'haber' ? linea.monto : 0,
            });
        }
    }

    // Línea de IVA (crédito fiscal en compras, IVA a pagar en ventas)
    const totalIva = parseFloat(compraVenta.importe_iva_10) + parseFloat(compraVenta.importe_iva_05);
    if (totalIva > 0) {
        const codigoIva = esCompra ? CODIGO_IVA_CREDITO_FISCAL : CODIGO_IVA_A_PAGAR;
        const cuentaIva = await buscarCuentaPorCodigo(id_empresa, codigoIva, transaction);
        if (!cuentaIva) {
            throw new Error(`No se encontró la cuenta de IVA (código ${codigoIva}) en el plan de cuentas de esta empresa`);
        }
        detalles.push({
            id_empresacuenta: cuentaIva.id_empresacuenta,
            debe: ladoIva === 'debe' ? totalIva : 0,
            haber: ladoIva === 'haber' ? totalIva : 0,
        });
    }

    // Línea de contrapartida: caja (contado) o proveedores/deudores (crédito)
    const codigoContrapartida = compraVenta.condicion === 'CONTADO'
        ? CODIGO_CAJA
        : (esCompra ? CODIGO_PROVEEDORES_LOCALES : CODIGO_DEUDORES_VENTAS);
    const cuentaContrapartida = await buscarCuentaPorCodigo(id_empresa, codigoContrapartida, transaction);
    if (!cuentaContrapartida) {
        throw new Error(`No se encontró la cuenta de contrapartida (código ${codigoContrapartida}) en el plan de cuentas de esta empresa`);
    }
    const totalFactura = parseFloat(compraVenta.total_factura);
    detalles.push({
        id_empresacuenta: cuentaContrapartida.id_empresacuenta,
        debe: ladoContrapartida === 'debe' ? totalFactura : 0,
        haber: ladoContrapartida === 'haber' ? totalFactura : 0,
    });

    return detalles;
};

export const getComprasVentas = async (req, res) => {
    const { desde = 0, limite = 10, tipo, id_empresa, imputada } = req.query;

    const idEmpresaNum = parseInt(id_empresa);
    if (!id_empresa || Number.isNaN(idEmpresaNum)) {
        return res.status(400).json({ msg: 'id_empresa es obligatorio y debe ser numérico' });
    }

    try {
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las compras/ventas de esta empresa' });
        }

        const where = { estado: 1 };
        if (tipo && ['COMPRA', 'VENTA'].includes(tipo.toUpperCase())) {
            where.tipo = tipo.toUpperCase();
        }
        if (imputada && ['SI', 'NO'].includes(imputada.toUpperCase())) {
            where.imputada = imputada.toUpperCase();
        }

        const [total, registros] = await Promise.all([
            CompraVenta.count({
                where,
                include: [{
                    model: ClienteProveedor,
                    where: { id_empresa: idEmpresaNum }
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
                        where: { id_empresa: idEmpresaNum }
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

/**
 * Devuelve las líneas debe/haber sugeridas para una compra/venta, para que
 * el alumno las revise y las cargue (editables) en el asiento manual.
 * No guarda nada — es solo una sugerencia calculada al vuelo.
 */
export const getSugerenciaAsiento = async (req, res) => {
    const { id } = req.params;

    try {
        const compraVenta = await CompraVenta.findByPk(id, {
            include: [{ model: Sucursal, attributes: ['id_empresa'] }]
        });
        if (!compraVenta) {
            return res.status(404).json({ msg: 'Compra/venta no encontrada' });
        }

        const id_empresa = compraVenta.Sucursal.id_empresa;

        if (!(await puedeAccederAEmpresa(req, id_empresa))) {
            return res.status(403).json({ msg: 'No tenés permiso sobre esta compra/venta' });
        }

        if (compraVenta.imputada === 'SI') {
            return res.status(400).json({ msg: 'Esta compra/venta ya fue imputada en un asiento' });
        }

        const detalles = await armarDetallesAsiento(compraVenta, id_empresa, null);

        // Se le suma info legible de cada cuenta para que el frontend
        // no tenga que ir a buscarla aparte.
        const cuentas = await EmpresaCuenta.findAll({
            where: { id_empresacuenta: detalles.map(d => d.id_empresacuenta) },
            attributes: ['id_empresacuenta', 'codigo', 'nombre']
        });
        const detallesConNombre = detalles.map(d => ({
            ...d,
            cuenta: cuentas.find(c => c.id_empresacuenta === d.id_empresacuenta)
        }));

        res.json({
            id_compraventa: compraVenta.id_compraventa,
            id_sucursal: compraVenta.id_sucursal,
            fecha: compraVenta.fecha,
            documento: compraVenta.numero_factura,
            concepto: compraVenta.concepto,
            tipo_asiento: compraVenta.tipo, // 'COMPRA' o 'VENTA'
            detalles: detallesConNombre
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: error.message || 'Error al calcular la sugerencia de asiento' });
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
    const transaction = await db.transaction();

    try {
        const sucursal = await Sucursal.findByPk(req.body.id_sucursal, { transaction });
        if (!sucursal) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'La sucursal indicada no existe' });
        }
        const id_empresa = sucursal.id_empresa;

        if (!(await puedeAccederAEmpresa(req, id_empresa))) {
            await transaction.rollback();
            return res.status(403).json({ msg: 'No tenés permiso para cargar compras/ventas en esta empresa' });
        }

        const nuevo = await CompraVenta.create({
            ...req.body,
            tipo: req.body.tipo?.toUpperCase(),
            imputada: 'NO'
        }, { transaction });

        const detalles = await armarDetallesAsiento(nuevo, id_empresa, transaction);

        const totalDebe = detalles.reduce((acc, d) => acc + d.debe, 0);
        const totalHaber = detalles.reduce((acc, d) => acc + d.haber, 0);
        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            await transaction.rollback();
            return res.status(400).json({
                msg: 'El asiento generado no está balanceado. Revisá los montos de exenta/gravada/IVA contra el total de la factura.'
            });
        }

        const numeroAsiento = `${nuevo.tipo === 'COMPRA' ? 'C' : 'V'}-${String(nuevo.id_compraventa).padStart(6, '0')}`;

        const asientoCabecera = await AsientoCabecera.create({
            id_empresa,
            id_sucursal: nuevo.id_sucursal,
            tipo_asiento: nuevo.tipo, // 'COMPRA' o 'VENTA', ya contemplado en el ENUM
            numero_asiento: numeroAsiento,
            fecha: nuevo.fecha,
            documento: nuevo.numero_factura,
            total_debe: totalDebe,
            total_haber: totalHaber,
            diferencia: totalDebe - totalHaber,
            concepto: nuevo.concepto,
            estado: 'pendiente'
        }, { transaction });

        await AsientoDetalle.bulkCreate(
            detalles.map(d => ({ ...d, id_asiento: asientoCabecera.id_asiento })),
            { transaction }
        );

        await nuevo.update({ imputada: 'SI' }, { transaction });

        await transaction.commit();

        res.status(201).json({
            msg: 'Registro creado y asiento generado correctamente',
            registro: nuevo,
            id_asiento: asientoCabecera.id_asiento
        });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: error.message || 'Error al crear registro' });
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