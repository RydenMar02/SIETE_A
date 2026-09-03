import { Op } from 'sequelize';
import db from '../db/conexion.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import Empresa from '../models/empresa.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import CompraVenta from '../models/compraVenta.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';
import { validarEjercicioAbiertoParaEscritura } from '../helpers/ejercicioHelper.js';

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
    },
    // Solo viene poblado cuando el asiento se generó automáticamente al
    // imputar una compra/venta (id_compraventa NOT NULL). El frontend lo
    // usa para mostrar la factura de origen en modo solo lectura -no se
    // puede "asociar" una compra/venta a mano: cada una ya tiene su único
    // asiento, generado por POST /compras-ventas/:id/imputar.
    {
        model: CompraVenta,
        as: 'compraVenta',
        required: false,
        attributes: ['id_compraventa', 'tipo', 'numero_factura', 'fecha', 'total_factura', 'condicion'],
        include: [{
            model: ClienteProveedor,
            attributes: ['razon_social', 'numero_identificacion']
        }]
    }
];

/**
 * Valida una línea de detalle individual: montos no negativos, no debe+haber
 * simultáneos, no ambos en cero, y que la cuenta exista, pertenezca a esta
 * empresa, sea asentable y esté activa. Devuelve null si está OK, o
 * { status, msg } si hay que rechazar. Reutilizada por crearAsiento y
 * actualizarAsiento para no duplicar la lógica.
 */
const validarLineaDetalle = async (detalle, id_empresa, transaction) => {
    const debe = parseFloat(detalle.debe || 0);
    const haber = parseFloat(detalle.haber || 0);

    if (debe < 0 || haber < 0) {
        return { status: 400, msg: 'Los montos de debe/haber no pueden ser negativos' };
    }
    if (debe > 0 && haber > 0) {
        return { status: 400, msg: 'Una línea no puede tener importe en debe y en haber a la vez' };
    }
    if (debe === 0 && haber === 0) {
        return { status: 400, msg: 'Una línea no puede tener debe y haber en cero' };
    }

    const cuenta = await EmpresaCuenta.findByPk(detalle.id_empresacuenta, { transaction });
    if (!cuenta) {
        return { status: 400, msg: `No existe la cuenta con id ${detalle.id_empresacuenta}` };
    }
    if (cuenta.id_empresa !== id_empresa) {
        return { status: 403, msg: `La cuenta "${cuenta.nombre}" no pertenece a esta empresa` };
    }
    if (cuenta.asentable?.toUpperCase() !== 'SI') {
        return { status: 400, msg: `La cuenta "${cuenta.nombre}" no es asentable` };
    }
    if (cuenta.estado !== 1) {
        return { status: 400, msg: `La cuenta "${cuenta.nombre}" está inactiva` };
    }

    return null;
};

/**
 * Valida el array completo de detalles: mínimo 1 línea, cada línea vía
 * validarLineaDetalle, y que el total debe = total haber. Devuelve
 * { error } si algo falla, o { totalDebe, totalHaber } si todo está OK.
 */
const validarDetalles = async (asientoDetalles, id_empresa, transaction) => {
    if (!Array.isArray(asientoDetalles) || asientoDetalles.length === 0) {
        return { error: { status: 400, msg: 'El asiento debe tener al menos una línea de detalle' } };
    }

    for (const detalle of asientoDetalles) {
        const errorLinea = await validarLineaDetalle(detalle, id_empresa, transaction);
        if (errorLinea) {
            return { error: errorLinea };
        }
    }

    const totalDebe = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.debe || 0), 0);
    const totalHaber = asientoDetalles.reduce((acc, d) => acc + parseFloat(d.haber || 0), 0);

    if (Math.abs(totalDebe - totalHaber) > 0.01) {
        return { error: { status: 400, msg: 'El asiento no está balanceado. Debe = Haber' } };
    }

    return { totalDebe, totalHaber };
};

/**
 * Distingue cuál UNIQUE de asiento_cabecera se violó inspeccionando
 * error.fields (las columnas reales del índice, expuestas por Sequelize) en
 * vez de depender de un texto de mensaje frágil, y responde 409 con un
 * mensaje específico según el índice real afectado.
 */
const responderConflictoUnique = (error, res) => {
    const campos = error.fields ? Object.keys(error.fields) : [];
    if (campos.includes('id_compraventa')) {
        return res.status(409).json({ msg: 'Esta compra/venta ya tiene un asiento asociado.' });
    }
    if (campos.includes('numero_asiento')) {
        return res.status(409).json({ msg: 'Ya existe un asiento con ese número para esta empresa.' });
    }
    return res.status(409).json({ msg: 'El registro entra en conflicto con datos existentes.' });
};

const PREFIJOS_TIPO_ASIENTO = { MANUAL: 'M', COMPRA: 'C', VENTA: 'V', AJUSTE: 'A', CIERRE: 'X' };

/**
 * Genera el próximo número para un tipo de asiento dentro de una empresa,
 * SIN confiar en lo que mande el cliente -si dos guardados llegan casi
 * juntos (misma empresa, mismo tipo), cada uno calculaba su número del
 * lado del navegador y podían pisarse.
 *
 * Usa un SELECT ... FOR UPDATE (lock: transaction.LOCK.UPDATE) sobre el
 * último asiento de esa empresa+tipo: si otra transacción está generando
 * un número para la misma combinación en simultáneo, esta lectura queda
 * esperando a que la otra termine (commit o rollback) en vez de leer un
 * dato que todavía puede cambiar -mismo patrón que ya usa
 * validarEjercicioAbiertoParaEscritura en ejercicioHelper.js.
 *
 * Límite conocido: si es el PRIMER asiento de esa empresa+tipo, no hay
 * ninguna fila que bloquear todavía, así que ese caso puntual conserva una
 * ventana de carrera mínima -por eso crearAsiento igual reintenta ante un
 * choque real; el UNIQUE de BD es la protección final en cualquier caso.
 */
const generarSiguienteNumeroAsiento = async (id_empresa, tipo_asiento, transaction) => {
    const prefijo = PREFIJOS_TIPO_ASIENTO[tipo_asiento] || 'M';

    const ultimo = await AsientoCabecera.findOne({
        where: { id_empresa, tipo_asiento },
        order: [['numero_asiento', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    const match = ultimo ? /^[A-Z]-(\d{5})$/.exec(ultimo.numero_asiento) : null;
    const siguiente = (match ? parseInt(match[1], 10) + 1 : 1).toString().padStart(5, '0');
    return `${prefijo}-${siguiente}`;
};

export const getAsientos = async (req, res) => {
    let { desde = 0, limite = 10, id_empresa, estado, fecha_desde, fecha_hasta, tipo_asiento } = req.query;

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
        if (tipo_asiento && ['MANUAL', 'COMPRA', 'VENTA', 'AJUSTE', 'CIERRE'].includes(tipo_asiento.toUpperCase())) {
            where.tipo_asiento = tipo_asiento.toUpperCase();
        }
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

        // C.4: la sucursal debe existir y pertenecer realmente a la empresa
        // indicada -antes solo se confiaba en ambos IDs recibidos del body.
        const sucursal = await Sucursal.findByPk(cabecera.id_sucursal, { transaction });
        if (!sucursal) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'La sucursal indicada no existe' });
        }
        if (sucursal.id_empresa !== cabecera.id_empresa) {
            await transaction.rollback();
            return res.status(403).json({ msg: 'La sucursal indicada no pertenece a la empresa indicada' });
        }

        // Bloqueo post-cierre: no se puede contabilizar nada con fecha
        // dentro de un ejercicio ya cerrado de la sala de esta empresa.
        const ejercicioCerrado = await validarEjercicioAbiertoParaEscritura(cabecera.id_empresa, cabecera.fecha, transaction);
        if (ejercicioCerrado) {
            await transaction.rollback();
            return res.status(400).json({
                msg: `La fecha indicada pertenece al ejercicio "${ejercicioCerrado.nombre}", que ya está cerrado. No se pueden registrar asientos en ese período.`
            });
        }

        // El número de asiento se genera acá, no se toma del body -por más
        // que el frontend calcule y muestre un número tentativo para que
        // el alumno vea algo antes de guardar, la palabra final es del
        // backend, calculada dentro de esta misma transacción.

        // Si el asiento viene de "cargar desde compra/venta", validar que
        // esa compra/venta exista, esté activa, sea de esta empresa, no esté
        // imputada ya, y que todavía no tenga otro asiento vinculado -esta
        // corrección ya fue probada en producción y se conserva intacta.
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
            if (compraVenta.estado !== 1) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'La compra/venta indicada está desactivada' });
            }
            if (compraVenta.Sucursal.id_empresa !== cabecera.id_empresa) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'La compra/venta indicada no pertenece a esta empresa' });
            }
            if (compraVenta.imputada === 'SI') {
                await transaction.rollback();
                return res.status(400).json({ msg: 'Esa compra/venta ya fue imputada en otro asiento' });
            }
            const asientoYaVinculado = await AsientoCabecera.findOne({
                where: { id_compraventa: compraVenta.id_compraventa },
                transaction
            });
            if (asientoYaVinculado) {
                await transaction.rollback();
                return res.status(409).json({ msg: 'Esa compra/venta ya tiene un asiento generado' });
            }
        }

        // C.3 + C.5 + D.4 + D.5: validación completa de líneas (montos,
        // debe/haber exclusivos, no vacías, cuenta de la misma empresa,
        // asentable, activa) + balance total.
        const { error: errorDetalles, totalDebe, totalHaber } = await validarDetalles(
            asientoDetalles, cabecera.id_empresa, transaction
        );
        if (errorDetalles) {
            await transaction.rollback();
            return res.status(errorDetalles.status).json({ msg: errorDetalles.msg });
        }

        // Crear cabecera (con reintento acotado: si el número generado
        // choca con uno que se insertó justo en el medio -caso extremo del
        // "primer asiento de este tipo" sin fila que bloquear, ver arriba-
        // se recalcula contra el estado real y se reintenta, en vez de
        // fallarle al usuario por una carrera de milisegundos).
        let nuevoCabecera;
        let intentosNumero = 0;
        while (true) {
            intentosNumero++;
            const numero_asiento = await generarSiguienteNumeroAsiento(cabecera.id_empresa, cabecera.tipo_asiento, transaction);
            try {
                nuevoCabecera = await AsientoCabecera.create({
                    ...cabecera,
                    numero_asiento,
                    id_compraventa: compraVenta ? compraVenta.id_compraventa : null,
                    total_debe: totalDebe,
                    total_haber: totalHaber,
                    diferencia: totalDebe - totalHaber,
                    estado: 'pendiente'
                }, { transaction });
                break;
            } catch (errorCreate) {
                const campos = errorCreate.fields ? Object.keys(errorCreate.fields) : [];
                const esChoqueDeNumero = errorCreate.name === 'SequelizeUniqueConstraintError' && campos.includes('numero_asiento');
                if (esChoqueDeNumero && intentosNumero < 3) continue;
                throw errorCreate;
            }
        }

        // Salvaguarda: si por cualquier motivo el asiento quedó creado sin
        // el id_compraventa correcto, abortamos antes de marcar la
        // compra/venta como imputada -nunca debe quedar imputada='SI' sin
        // un asiento realmente vinculado por FK.
        if (compraVenta && Number(nuevoCabecera.id_compraventa) !== Number(compraVenta.id_compraventa)) {
            await transaction.rollback();
            console.error(
                `[crearAsiento] id_compraventa no coincide tras crear el asiento: esperado ${compraVenta.id_compraventa}, obtenido ${nuevoCabecera.id_compraventa}`
            );
            return res.status(500).json({
                msg: 'Error interno: el asiento generado no quedó vinculado correctamente a la compra/venta. No se aplicó ningún cambio.'
            });
        }

        // Crear detalles
        await AsientoDetalle.bulkCreate(
            asientoDetalles.map(d => ({ ...d, id_asiento: nuevoCabecera.id_asiento })),
            { transaction }
        );

        // Si vino de una compra/venta, marcarla como ya imputada
        if (compraVenta) {
            await compraVenta.update({ imputada: 'SI' }, { transaction });
        }

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: cabecera.id_empresa,
            tipo: 'CARGO_ASIENTO',
            descripcion: `Cargó el asiento ${cabecera.numero_asiento}`,
            referencia_id: nuevoCabecera.id_asiento,
            transaction
        });

        await transaction.commit();

        const asientoCompleto = await AsientoCabecera.findByPk(nuevoCabecera.id_asiento, {
            include: includeCompleto
        });

        res.status(201).json({ msg: 'Asiento creado', asiento: asientoCompleto });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return responderConflictoUnique(error, res);
        }
        res.status(500).json({ msg: 'Error al crear asiento' });
    }
};

export const actualizarAsiento = async (req, res) => {
    const transaction = await db.transaction();
    const { id } = req.params;

    try {
        const asiento = await AsientoCabecera.findByPk(id, { transaction });
        if (!asiento) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        // C.1: solo un asiento 'pendiente' puede modificarse. 'procesado' y
        // 'anulado' quedan bloqueados por igual -antes solo se rechazaba
        // 'procesado', dejando 'anulado' editable por error.
        if (asiento.estado !== 'pendiente') {
            await transaction.rollback();
            return res.status(400).json({
                msg: asiento.estado === 'procesado'
                    ? 'No se puede modificar un asiento procesado'
                    : 'No se puede modificar un asiento anulado'
            });
        }

        // Bloqueo post-cierre, en dos sentidos:
        // A) la fecha ORIGINAL del asiento ya pertenece a un ejercicio
        //    cerrado -no importa qué se quiera cambiar, ya no se toca.
        // B) si el body trae una fecha NUEVA, tampoco puede "mover" el
        //    asiento hacia adentro de un ejercicio cerrado.
        const ejercicioCerradoOriginal = await validarEjercicioAbiertoParaEscritura(asiento.id_empresa, asiento.fecha, transaction);
        if (ejercicioCerradoOriginal) {
            await transaction.rollback();
            return res.status(400).json({
                msg: `Este asiento pertenece al ejercicio "${ejercicioCerradoOriginal.nombre}", que ya está cerrado. No se puede modificar.`
            });
        }
        if (req.body.fecha !== undefined && req.body.fecha !== asiento.fecha) {
            const ejercicioCerradoNuevo = await validarEjercicioAbiertoParaEscritura(asiento.id_empresa, req.body.fecha, transaction);
            if (ejercicioCerradoNuevo) {
                await transaction.rollback();
                return res.status(400).json({
                    msg: `No se puede mover el asiento a una fecha del ejercicio "${ejercicioCerradoNuevo.nombre}", que ya está cerrado.`
                });
            }
        }

        // Lista blanca explícita: NUNCA se hace asiento.update(req.body).
        // id_empresa, id_sucursal, id_compraventa, estado, numero_asiento y
        // tipo_asiento quedan siempre fuera de lo editable por PUT -esos
        // campos estructurales solo cambian mediante las acciones de
        // negocio correspondientes (crear, procesar, o la anulación desde
        // Compra/Venta).
        const datosEditables = {};
        if (req.body.fecha !== undefined) datosEditables.fecha = req.body.fecha;
        if (req.body.documento !== undefined) datosEditables.documento = req.body.documento;
        if (req.body.concepto !== undefined) datosEditables.concepto = req.body.concepto;

        // Si no viene asientoDetalles en el body, se conservan los actuales.
        // Si viene como [], se rechaza explícitamente (no se ignora en
        // silencio): un asiento siempre debe tener al menos una línea.
        if (req.body.asientoDetalles !== undefined) {
            const { error: errorDetalles, totalDebe, totalHaber } = await validarDetalles(
                req.body.asientoDetalles, asiento.id_empresa, transaction
            );
            if (errorDetalles) {
                await transaction.rollback();
                return res.status(errorDetalles.status).json({ msg: errorDetalles.msg });
            }

            await AsientoDetalle.destroy({ where: { id_asiento: id }, transaction });
            await AsientoDetalle.bulkCreate(
                req.body.asientoDetalles.map(d => ({ ...d, id_asiento: id })),
                { transaction }
            );

            datosEditables.total_debe = totalDebe;
            datosEditables.total_haber = totalHaber;
            datosEditables.diferencia = totalDebe - totalHaber;
        }

        await asiento.update(datosEditables, { transaction });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: asiento.id_empresa,
            tipo: 'MODIFICO_ASIENTO',
            descripcion: `Modificó el asiento ${asiento.numero_asiento}`,
            referencia_id: asiento.id_asiento,
            transaction
        });

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
        const asiento = await AsientoCabecera.findByPk(id, { transaction });
        if (!asiento) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        // C.2: un asiento vinculado a una CompraVenta nunca se borra desde
        // el módulo genérico, sin importar su estado -la única vía correcta
        // para corregirlo es la anulación desde Compra/Venta, que mantiene
        // la FK y el historial intactos.
        if (asiento.id_compraventa !== null) {
            await transaction.rollback();
            return res.status(400).json({
                msg: 'Este asiento está asociado a una compra/venta. Para corregirlo, usá el flujo de anulación de Compra/Venta (POST /api/compras-ventas/:id/anular), no el borrado directo de Asientos.'
            });
        }

        if (asiento.estado !== 'pendiente') {
            await transaction.rollback();
            return res.status(400).json({
                msg: asiento.estado === 'procesado'
                    ? 'No se puede eliminar un asiento procesado'
                    : 'No se puede eliminar un asiento anulado'
            });
        }

        // El ejercicio cerrado prevalece incluso sobre un pendiente sin
        // id_compraventa: si su fecha cae dentro de un ejercicio ya
        // cerrado, no se borra, sin excepción.
        const ejercicioCerrado = await validarEjercicioAbiertoParaEscritura(asiento.id_empresa, asiento.fecha, transaction);
        if (ejercicioCerrado) {
            await transaction.rollback();
            return res.status(400).json({
                msg: `Este asiento pertenece al ejercicio "${ejercicioCerrado.nombre}", que ya está cerrado. No se puede eliminar.`
            });
        }

        const { id_asiento, numero_asiento, id_empresa } = asiento;

        // Sin ON DELETE CASCADE a nivel de BD: los detalles se borran
        // explícitamente, dentro de la misma transacción, antes de borrar
        // la cabecera.
        await AsientoDetalle.destroy({ where: { id_asiento }, transaction });
        await asiento.destroy({ transaction });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: 'ELIMINO_ASIENTO',
            descripcion: `Eliminó el asiento ${numero_asiento}`,
            referencia_id: id_asiento,
            transaction
        });

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
    const transaction = await db.transaction();

    try {
        const asiento = await AsientoCabecera.findByPk(id, { transaction });
        if (!asiento) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Asiento no encontrado' });
        }

        // D.1 + bloqueo explícito de 'anulado': solo 'pendiente' puede
        // procesarse. Antes solo se rechazaba 'procesado', dejando
        // 'anulado' pasar la validación por error.
        if (asiento.estado !== 'pendiente') {
            await transaction.rollback();
            return res.status(400).json({
                msg: asiento.estado === 'procesado'
                    ? 'El asiento ya está procesado'
                    : 'No se puede procesar un asiento anulado'
            });
        }

        if (Math.abs(parseFloat(asiento.diferencia)) > 0.01) {
            await transaction.rollback();
            return res.status(400).json({ msg: 'No se puede procesar un asiento no balanceado' });
        }

        // Defensa histórica: en un cierre nuevo esto no debería poder pasar
        // (el cierre exige 0 pendientes en el rango antes de cerrar), pero
        // si existiera un pendiente histórico de un ejercicio que quedó
        // cerrado por alguna inconsistencia previa, no debe poder procesarse.
        const ejercicioCerrado = await validarEjercicioAbiertoParaEscritura(asiento.id_empresa, asiento.fecha, transaction);
        if (ejercicioCerrado) {
            await transaction.rollback();
            return res.status(400).json({
                msg: `Este asiento pertenece al ejercicio "${ejercicioCerrado.nombre}", que ya está cerrado. No se puede procesar.`
            });
        }

        await asiento.update({ estado: 'procesado' }, { transaction });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: asiento.id_empresa,
            tipo: 'PROCESO_ASIENTO',
            descripcion: `Procesó el asiento ${asiento.numero_asiento}`,
            referencia_id: asiento.id_asiento,
            transaction
        });

        await transaction.commit();

        res.json({ msg: 'Asiento procesado', asiento });
    } catch (error) {
        await transaction.rollback();
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