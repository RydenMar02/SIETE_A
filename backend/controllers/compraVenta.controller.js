import { Op } from 'sequelize';
import CompraVenta from '../models/compraVenta.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import db from '../db/conexion.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';

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
 *
 * Se reutiliza tal cual tanto desde la previsualización (GET
 * /:id/sugerencia-asiento) como desde la imputación real (POST
 * /:id/imputar) para no duplicar la lógica contable.
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

/**
 * Valida que el cliente/proveedor exista, pertenezca a la misma empresa que
 * la operación, y que su tipo (CLIENTE/PROVEEDOR) sea el correcto según si
 * la operación es una COMPRA o una VENTA.
 * Devuelve null si está todo bien, o { status, msg } si hay que rechazar.
 */
const validarClienteProveedor = async (id_clienteproveedor, tipoOperacion, id_empresa, transaction) => {
    const clienteProveedor = await ClienteProveedor.findByPk(id_clienteproveedor, { transaction });
    if (!clienteProveedor) {
        return { status: 400, msg: 'El cliente/proveedor indicado no existe' };
    }
    if (clienteProveedor.id_empresa !== id_empresa) {
        return { status: 403, msg: 'El cliente/proveedor no pertenece a esta empresa' };
    }
    const tipoEsperado = tipoOperacion === 'COMPRA' ? 'PROVEEDOR' : 'CLIENTE';
    if (clienteProveedor.tipo !== tipoEsperado) {
        return {
            status: 400,
            msg: tipoOperacion === 'COMPRA'
                ? 'Para una COMPRA, el cliente/proveedor debe ser de tipo PROVEEDOR'
                : 'Para una VENTA, el cliente/proveedor debe ser de tipo CLIENTE'
        };
    }
    return null;
};

/**
 * Busca una compra/venta ACTIVA que choque con la regla de duplicados:
 *  - COMPRA: mismo id_clienteproveedor + numero_timbrado + numero_factura.
 *  - VENTA:  mismo id_sucursal + numero_timbrado + numero_factura.
 * Si se pasa id_compraventa_excluir (caso UPDATE), se ignora ese propio registro.
 */
const buscarDuplicado = async (tipoOperacion, id_clienteproveedor, id_sucursal, numero_timbrado, numero_factura, id_compraventa_excluir, transaction) => {
    const where = {
        tipo: tipoOperacion,
        numero_timbrado,
        numero_factura,
        estado: 1,
    };
    if (tipoOperacion === 'COMPRA') {
        where.id_clienteproveedor = id_clienteproveedor;
    } else {
        where.id_sucursal = id_sucursal;
    }
    if (id_compraventa_excluir) {
        where.id_compraventa = { [Op.ne]: id_compraventa_excluir };
    }
    return CompraVenta.findOne({ where, transaction });
};

/**
 * Valida que una cuenta de contenido (exenta/grav10/grav05) elegida por el
 * alumno exista, pertenezca a esta empresa y sea asentable. Evita imputar o
 * guardar una referencia a la cuenta de otra empresa.
 */
const validarCuentaDeContenido = async (id_empresacuenta, id_empresa, etiqueta, transaction) => {
    const cuenta = await EmpresaCuenta.findOne({
        where: { id_empresacuenta, id_empresa, estado: 1 },
        transaction
    });
    if (!cuenta) {
        return { status: 400, msg: `La cuenta de ${etiqueta} indicada no existe o no pertenece a esta empresa` };
    }
    if (cuenta.asentable !== 'SI') {
        return { status: 400, msg: `La cuenta de ${etiqueta} elegida no es asentable` };
    }
    return null;
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
 * PREVISUALIZACIÓN DEL ASIENTO.
 * Devuelve las líneas debe/haber que se generarían si esta compra/venta se
 * imputara en este momento, usando exactamente la misma lógica contable que
 * POST /:id/imputar (armarDetallesAsiento). No persiste absolutamente nada:
 * no crea AsientoCabecera, no crea AsientoDetalle, no toca imputada.
 * Solo tiene sentido sobre un borrador (imputada='NO'); una vez imputada la
 * operación, el asiento real ya existe y se consulta por su propio módulo.
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

/**
 * Crea SIEMPRE un borrador (imputada='NO'). El POST ya no genera asiento
 * bajo ninguna circunstancia -eso es responsabilidad exclusiva de
 * POST /:id/imputar-, así que cualquier valor de "imputada" que venga en
 * el body se ignora por completo.
 */
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

        const tipoOperacion = req.body.tipo?.toUpperCase();

        const errorClienteProveedor = await validarClienteProveedor(
            req.body.id_clienteproveedor, tipoOperacion, id_empresa, transaction
        );
        if (errorClienteProveedor) {
            await transaction.rollback();
            return res.status(errorClienteProveedor.status).json({ msg: errorClienteProveedor.msg });
        }

        const duplicado = await buscarDuplicado(
            tipoOperacion,
            req.body.id_clienteproveedor,
            req.body.id_sucursal,
            req.body.numero_timbrado,
            req.body.numero_factura,
            null,
            transaction
        );
        if (duplicado) {
            await transaction.rollback();
            return res.status(409).json({
                msg: `Ya existe ${tipoOperacion === 'COMPRA' ? 'una compra' : 'una venta'} activa con el mismo número de factura y timbrado para ${tipoOperacion === 'COMPRA' ? 'este proveedor' : 'esta sucursal'}`
            });
        }

        // imputada nunca llega desde el body: el POST solo crea borradores.
        const { imputada: _imputadaIgnorada, ...datosCreacion } = req.body;
        const nuevo = await CompraVenta.create({
            ...datosCreacion,
            tipo: tipoOperacion,
            imputada: 'NO'
        }, { transaction });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: nuevo.tipo === 'COMPRA' ? 'CARGO_COMPRA' : 'CARGO_VENTA',
            descripcion: `Cargó la ${nuevo.tipo === 'COMPRA' ? 'compra' : 'venta'} N° ${nuevo.numero_factura} como borrador`,
            referencia_id: nuevo.id_compraventa,
            transaction
        });

        await transaction.commit();

        res.status(201).json({ msg: 'Borrador de compra/venta creado correctamente', registro: nuevo });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: error.message || 'Error al crear registro' });
    }
};

/**
 * ACCIÓN DE NEGOCIO: imputa contablemente un borrador (imputada='NO').
 * Genera el AsientoCabecera (con id_compraventa) + AsientoDetalle
 * correspondiente y recién ahí pasa imputada a 'SI'. Todo dentro de una
 * única transacción: si cualquier paso falla, no debe quedar ni el asiento
 * a medias ni la compra/venta marcada como imputada sin un asiento real.
 */
export const imputarCompraVenta = async (req, res) => {
    const { id } = req.params;
    const transaction = await db.transaction();

    try {
        const registro = await CompraVenta.findByPk(id, { transaction });
        if (!registro) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        if (registro.estado !== 1) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'No se puede imputar un registro desactivado' });
        }

        if (registro.imputada === 'SI') {
            await transaction.rollback();
            return res.status(400).json({ msg: 'Esta compra/venta ya fue imputada' });
        }

        const sucursal = await Sucursal.findByPk(registro.id_sucursal, { transaction });
        if (!sucursal) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'La sucursal indicada no existe' });
        }
        const id_empresa = sucursal.id_empresa;

        const errorClienteProveedor = await validarClienteProveedor(
            registro.id_clienteproveedor, registro.tipo, id_empresa, transaction
        );
        if (errorClienteProveedor) {
            await transaction.rollback();
            return res.status(errorClienteProveedor.status).json({ msg: errorClienteProveedor.msg });
        }

        // Validar las cuentas de contenido que realmente van a formar parte
        // del asiento (mismo filtro que usa armarDetallesAsiento: solo las
        // que tienen importe > 0). Si hay importe pero no se eligió cuenta,
        // se rechaza acá con un mensaje claro en vez de dejar que el asiento
        // salga desbalanceado.
        const lineasDeContenido = [
            { id_empresacuenta: registro.id_cuentaexenta, monto: parseFloat(registro.exenta), etiqueta: 'exenta' },
            { id_empresacuenta: registro.id_cuentagrav10, monto: parseFloat(registro.base_imp_iva_10), etiqueta: 'gravada 10%' },
            { id_empresacuenta: registro.id_cuentagrav05, monto: parseFloat(registro.base_imp_iva_05), etiqueta: 'gravada 5%' },
        ];
        for (const linea of lineasDeContenido) {
            if (linea.monto > 0 && !linea.id_empresacuenta) {
                await transaction.rollback();
                return res.status(400).json({ msg: `Falta indicar la cuenta de ${linea.etiqueta} antes de imputar` });
            }
            if (linea.id_empresacuenta && linea.monto > 0) {
                const errorCuenta = await validarCuentaDeContenido(linea.id_empresacuenta, id_empresa, linea.etiqueta, transaction);
                if (errorCuenta) {
                    await transaction.rollback();
                    return res.status(errorCuenta.status).json({ msg: errorCuenta.msg });
                }
            }
        }

        const detalles = await armarDetallesAsiento(registro, id_empresa, transaction);

        const totalDebe = detalles.reduce((acc, d) => acc + d.debe, 0);
        const totalHaber = detalles.reduce((acc, d) => acc + d.haber, 0);
        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            await transaction.rollback();
            return res.status(400).json({
                msg: 'El asiento generado no está balanceado. Revisá los montos de exenta/gravada/IVA contra el total de la factura.'
            });
        }

        const numeroAsiento = `${registro.tipo === 'COMPRA' ? 'C' : 'V'}-${String(registro.id_compraventa).padStart(6, '0')}`;

        const asientoCabecera = await AsientoCabecera.create({
            id_empresa,
            id_sucursal: registro.id_sucursal,
            id_compraventa: registro.id_compraventa,
            tipo_asiento: registro.tipo, // 'COMPRA' o 'VENTA'
            numero_asiento: numeroAsiento,
            fecha: registro.fecha,
            documento: registro.numero_factura,
            total_debe: totalDebe,
            total_haber: totalHaber,
            diferencia: totalDebe - totalHaber,
            concepto: registro.concepto,
            estado: 'pendiente'
        }, { transaction });

        // Salvaguarda: si por cualquier motivo (código desactualizado en el
        // proceso corriendo, modelo desalineado con la BD, etc.) el asiento
        // quedó creado sin el id_compraventa correcto, no seguimos como si
        // nada -abortamos todo antes de tocar AsientoDetalle o marcar
        // imputada='SI', en vez de dejar un vínculo roto en silencio.
        if (Number(asientoCabecera.id_compraventa) !== Number(registro.id_compraventa)) {
            await transaction.rollback();
            console.error(
                `[imputarCompraVenta] id_compraventa no coincide tras crear el asiento: esperado ${registro.id_compraventa}, obtenido ${asientoCabecera.id_compraventa}`
            );
            return res.status(500).json({
                msg: 'Error interno: el asiento generado no quedó vinculado correctamente a la compra/venta. No se aplicó ningún cambio.'
            });
        }

        await AsientoDetalle.bulkCreate(
            detalles.map(d => ({ ...d, id_asiento: asientoCabecera.id_asiento })),
            { transaction }
        );

        await registro.update({ imputada: 'SI' }, { transaction });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: 'ASIENTO_AUTOMATICO',
            descripcion: `Generó el asiento ${numeroAsiento} al imputar la ${registro.tipo === 'COMPRA' ? 'compra' : 'venta'} ${registro.numero_factura}`,
            referencia_id: asientoCabecera.id_asiento,
            transaction
        });

        await transaction.commit();

        res.status(201).json({
            msg: 'Compra/venta imputada correctamente',
            registro,
            id_asiento: asientoCabecera.id_asiento
        });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ msg: 'Esta compra/venta ya tiene un asiento generado' });
        }
        res.status(500).json({ msg: error.message || 'Error al imputar el registro' });
    }
};

/**
 * Permite modificar un borrador (imputada='NO'). imputada e id_compraventa
 * nunca se aceptan por PUT -imputada solo cambia vía POST /:id/imputar-, y
 * tipo tampoco es editable (no está contemplado convertir una COMPRA en
 * VENTA o viceversa). Antes de guardar, se vuelve a validar todo contra los
 * valores EFECTIVOS (lo que ya tenía + lo que cambia en este request).
 */
export const actualizarCompraVenta = async (req, res) => {
    const { id } = req.params;
    const { imputada, id_compraventa, tipo, ...datosEditables } = req.body;

    try {
        const registro = await CompraVenta.findByPk(id);
        if (!registro) {
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        if (registro.imputada === 'SI') {
            return res.status(400).json({ msg: 'No se puede modificar una factura ya imputada' });
        }

        const id_sucursal_efectivo = datosEditables.id_sucursal ?? registro.id_sucursal;
        const id_clienteproveedor_efectivo = datosEditables.id_clienteproveedor ?? registro.id_clienteproveedor;
        const numero_timbrado_efectivo = datosEditables.numero_timbrado ?? registro.numero_timbrado;
        const numero_factura_efectivo = datosEditables.numero_factura ?? registro.numero_factura;

        const sucursal = await Sucursal.findByPk(id_sucursal_efectivo);
        if (!sucursal) {
            return res.status(400).json({ msg: 'La sucursal indicada no existe' });
        }
        const id_empresa = sucursal.id_empresa;

        if (!(await puedeAccederAEmpresa(req, id_empresa))) {
            return res.status(403).json({ msg: 'No tenés permiso para modificar compras/ventas en esta empresa' });
        }

        const errorClienteProveedor = await validarClienteProveedor(
            id_clienteproveedor_efectivo, registro.tipo, id_empresa, null
        );
        if (errorClienteProveedor) {
            return res.status(errorClienteProveedor.status).json({ msg: errorClienteProveedor.msg });
        }

        const duplicado = await buscarDuplicado(
            registro.tipo,
            id_clienteproveedor_efectivo,
            id_sucursal_efectivo,
            numero_timbrado_efectivo,
            numero_factura_efectivo,
            registro.id_compraventa,
            null
        );
        if (duplicado) {
            return res.status(409).json({
                msg: `Ya existe ${registro.tipo === 'COMPRA' ? 'otra compra' : 'otra venta'} activa con el mismo número de factura y timbrado para ${registro.tipo === 'COMPRA' ? 'este proveedor' : 'esta sucursal'}`
            });
        }

        const id_cuentaexenta_efectivo = datosEditables.id_cuentaexenta !== undefined ? datosEditables.id_cuentaexenta : registro.id_cuentaexenta;
        const id_cuentagrav10_efectivo = datosEditables.id_cuentagrav10 !== undefined ? datosEditables.id_cuentagrav10 : registro.id_cuentagrav10;
        const id_cuentagrav05_efectivo = datosEditables.id_cuentagrav05 !== undefined ? datosEditables.id_cuentagrav05 : registro.id_cuentagrav05;
        const cuentasAValidar = [
            { id_empresacuenta: id_cuentaexenta_efectivo, etiqueta: 'exenta' },
            { id_empresacuenta: id_cuentagrav10_efectivo, etiqueta: 'gravada 10%' },
            { id_empresacuenta: id_cuentagrav05_efectivo, etiqueta: 'gravada 5%' },
        ];
        for (const cuentaLinea of cuentasAValidar) {
            if (cuentaLinea.id_empresacuenta) {
                const errorCuenta = await validarCuentaDeContenido(cuentaLinea.id_empresacuenta, id_empresa, cuentaLinea.etiqueta, null);
                if (errorCuenta) {
                    return res.status(errorCuenta.status).json({ msg: errorCuenta.msg });
                }
            }
        }

        await registro.update(datosEditables);

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: registro.tipo === 'COMPRA' ? 'MODIFICO_COMPRA' : 'MODIFICO_VENTA',
            descripcion: `Modificó la ${registro.tipo === 'COMPRA' ? 'compra' : 'venta'} N° ${registro.numero_factura}`,
            referencia_id: registro.id_compraventa
        });

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

        const sucursal = await Sucursal.findByPk(registro.id_sucursal);
        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: sucursal.id_empresa,
            tipo: registro.tipo === 'COMPRA' ? 'ELIMINO_COMPRA' : 'ELIMINO_VENTA',
            descripcion: `Eliminó la ${registro.tipo === 'COMPRA' ? 'compra' : 'venta'} N° ${registro.numero_factura}`,
            referencia_id: registro.id_compraventa
        });

        res.json({ msg: 'Registro desactivado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar registro' });
    }
};

/**
 * ACCIÓN DE NEGOCIO: anula una compra/venta ya imputada junto con su
 * AsientoCabecera asociado. El asiento se encuentra EXCLUSIVAMENTE por la
 * FK formal (id_compraventa) -nunca por numero_asiento, documento ni
 * parseo de strings. No borra nada físicamente: AsientoCabecera pasa a
 * estado='anulado' (excluido de reportes) y CompraVenta pasa a estado=0
 * (excluido de duplicados), pero conserva imputada='SI' como historial.
 * Todo dentro de una única transacción -si cualquier paso falla, rollback
 * completo y ningún cambio queda aplicado.
 */
export const anularCompraVenta = async (req, res) => {
    const { id } = req.params;
    const transaction = await db.transaction();

    try {
        const registro = await CompraVenta.findByPk(id, { transaction });
        if (!registro) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Registro no encontrado' });
        }

        const sucursal = await Sucursal.findByPk(registro.id_sucursal, { transaction });
        if (!sucursal) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'La sucursal indicada no existe' });
        }
        const id_empresa = sucursal.id_empresa;

        if (!(await puedeAccederAEmpresa(req, id_empresa))) {
            await transaction.rollback();
            return res.status(403).json({ msg: 'No tenés permiso para anular compras/ventas de esta empresa' });
        }

        if (registro.estado !== 1) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'Esta compra/venta ya está anulada o desactivada' });
        }

        if (registro.imputada !== 'SI') {
            await transaction.rollback();
            return res.status(400).json({
                msg: 'Solo se puede anular una compra/venta que ya fue imputada. Un borrador se desactiva con el DELETE correspondiente.'
            });
        }

        const asiento = await AsientoCabecera.findOne({
            where: { id_compraventa: registro.id_compraventa },
            transaction
        });
        if (!asiento) {
            await transaction.rollback();
            return res.status(409).json({
                msg: 'No se encontró el asiento contable asociado a esta compra/venta. No se puede anular de forma segura.'
            });
        }

        if (asiento.estado === 'anulado') {
            await transaction.rollback();
            return res.status(400).json({ msg: 'El asiento asociado ya está anulado' });
        }

        await asiento.update({ estado: 'anulado' }, { transaction });
        await registro.update({ estado: 0 }, { transaction }); // imputada se mantiene en 'SI': queda como historial

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: registro.tipo === 'COMPRA' ? 'ANULO_COMPRA' : 'ANULO_VENTA',
            descripcion: `Anuló la ${registro.tipo === 'COMPRA' ? 'compra' : 'venta'} N° ${registro.numero_factura} y su asiento ${asiento.numero_asiento} (id_asiento ${asiento.id_asiento})`,
            referencia_id: registro.id_compraventa,
            transaction
        });

        await transaction.commit();

        res.json({
            msg: 'Compra/venta anulada correctamente junto con su asiento contable',
            registro,
            id_asiento_anulado: asiento.id_asiento
        });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: error.message || 'Error al anular el registro' });
    }
};