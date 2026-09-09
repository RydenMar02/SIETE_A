import { Op, fn, col, where as sequelizeWhere } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { create } from 'express-handlebars';
import Sala from '../models/sala.js';
import SalaUsuario from '../models/salaUsuario.js';
import Usuario from '../models/usuario.js';
import Empresa from '../models/empresa.js';
import Sucursal from '../models/sucursal.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import Ciudad from '../models/ciudad.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import CompraVenta from '../models/compraVenta.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import Movimiento from '../models/movimiento.js';
import { esProfesorDeSala } from '../middlewares/pertenencia.middleware.js';
import { validarFiltroFechas, generarYEnviarPdf } from '../helpers/reportesHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

/** DATE(createdAt) = :fecha, reutilizable en cualquier where de Sequelize */
const filtroDelDia = (fecha) => sequelizeWhere(fn('DATE', col('createdAt')), fecha);

/**
 * Resuelve Sala -> Alumno -> Empresa desde BD, sin confiar en nada que
 * mande el cliente más allá de id_sala/id_usuario. Devuelve { error } con
 * status/msg, o { sala, alumno, empresa } si todo resuelve bien.
 */
const resolverContexto = async (req, id_sala, id_usuario) => {
    const sala = await Sala.findByPk(id_sala);
    if (!sala) {
        return { error: { status: 404, msg: 'La sala indicada no existe' } };
    }

    if (!(await esProfesorDeSala(req, id_sala))) {
        return { error: { status: 403, msg: 'Solo el profesor de esta sala puede generar este reporte' } };
    }

    const salaUsuarioAlumno = await SalaUsuario.findOne({
        where: { id_sala, id_alumno: id_usuario, tipo: 'ALUMNO', estado: 1 },
        include: [{ model: Usuario, as: 'Alumno', attributes: ['id_usuario', 'nombre', 'cedula'] }]
    });
    if (!salaUsuarioAlumno) {
        return { error: { status: 404, msg: 'El alumno indicado no pertenece a esta sala' } };
    }

    const empresa = await Empresa.findOne({
        where: { id_salausuario: salaUsuarioAlumno.id_salausuario },
        attributes: ['id_empresa', 'nombre', 'ruc', 'sigla', 'estado']
    });
    if (!empresa) {
        return { error: { status: 404, msg: 'El alumno todavía no tiene una empresa creada en esta sala' } };
    }

    return { sala, alumno: salaUsuarioAlumno.Alumno, empresa };
};

/**
 * Arma las 8 secciones del reporte con consultas SEPARADAS (sin UNION,
 * cada tabla tiene columnas distintas). Reusado por el JSON y el PDF.
 */
const construirReporteActividad = async (id_empresa, id_usuario, fecha) => {
    const [sucursales, clientes, proveedores, cuentasManuales, compras, ventas, asientos, movimientos] = await Promise.all([
        Sucursal.findAll({
            where: { id_empresa, [Op.and]: filtroDelDia(fecha) },
            order: [['createdAt', 'ASC']]
        }),
        ClienteProveedor.findAll({
            where: { id_empresa, tipo: 'CLIENTE', [Op.and]: filtroDelDia(fecha) },
            include: [{ model: Ciudad, attributes: ['nombre'] }],
            order: [['createdAt', 'ASC']]
        }),
        ClienteProveedor.findAll({
            where: { id_empresa, tipo: 'PROVEEDOR', [Op.and]: filtroDelDia(fecha) },
            include: [{ model: Ciudad, attributes: ['nombre'] }],
            order: [['createdAt', 'ASC']]
        }),
        EmpresaCuenta.findAll({
            // Regla ya definida: pordefecto=0 son las creadas manualmente
            // por el alumno -las ~303 copiadas del plan maestro tienen
            // pordefecto=1 y NUNCA deben aparecer acá.
            where: { id_empresa, pordefecto: 0, [Op.and]: filtroDelDia(fecha) },
            order: [['createdAt', 'ASC']]
        }),
        CompraVenta.findAll({
            where: { tipo: 'COMPRA', [Op.and]: filtroDelDia(fecha) },
            include: [
                { model: Sucursal, where: { id_empresa }, attributes: ['nombre'] },
                { model: ClienteProveedor, attributes: ['razon_social', 'numero_identificacion'] }
            ],
            order: [['createdAt', 'ASC']]
        }),
        CompraVenta.findAll({
            where: { tipo: 'VENTA', [Op.and]: filtroDelDia(fecha) },
            include: [
                { model: Sucursal, where: { id_empresa }, attributes: ['nombre'] },
                { model: ClienteProveedor, attributes: ['razon_social', 'numero_identificacion'] }
            ],
            order: [['createdAt', 'ASC']]
        }),
        AsientoCabecera.findAll({
            // Reporte de actividad: a propósito NO se excluye estado='anulado'
            // acá -esto muestra "qué hizo el alumno", no un reporte contable.
            where: { id_empresa, [Op.and]: filtroDelDia(fecha) },
            include: [
                { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
                {
                    model: AsientoDetalle,
                    as: 'asientoDetalles',
                    include: [{ model: EmpresaCuenta, as: 'empresaCuenta', attributes: ['codigo', 'nombre'] }]
                }
            ],
            order: [['createdAt', 'ASC']]
        }),
        Movimiento.findAll({
            where: { id_usuario, id_empresa, [Op.and]: filtroDelDia(fecha) },
            order: [['createdAt', 'ASC']]
        })
    ]);

    // Resolver código/nombre del padre de cada cuenta manual con UNA sola
    // consulta extra (no N+1): traigo todo el plan de la empresa y armo un
    // mapa id_cuenta -> {codigo, nombre} en memoria. La relación correcta
    // es (id_empresa, id_cuenta), nunca id_padre = id_empresacuenta.
    let cuentasConPadre = cuentasManuales;
    if (cuentasManuales.length > 0) {
        const todasLasCuentas = await EmpresaCuenta.findAll({
            where: { id_empresa },
            attributes: ['id_cuenta', 'codigo', 'nombre']
        });
        const mapaPorIdCuenta = new Map(todasLasCuentas.map(c => [c.id_cuenta, c]));
        cuentasConPadre = cuentasManuales.map(c => {
            const padre = c.id_padre !== null ? mapaPorIdCuenta.get(c.id_padre) : null;
            return {
                ...c.toJSON(),
                codigo_padre: padre?.codigo || null,
                nombre_padre: padre?.nombre || null
            };
        });
    }

    return { sucursales, clientes, proveedores, cuentas: cuentasConPadre, compras, ventas, asientos, movimientos };
};

export const getReporteActividadAlumno = async (req, res) => {
    const { id_sala, id_usuario } = req.query;

    try {
        if (!id_sala || !Number.isInteger(Number(id_sala)) || Number(id_sala) <= 0) {
            return res.status(400).json({ msg: 'id_sala debe ser un entero positivo' });
        }
        if (!id_usuario || !Number.isInteger(Number(id_usuario)) || Number(id_usuario) <= 0) {
            return res.status(400).json({ msg: 'id_usuario debe ser un entero positivo' });
        }

        // Reutiliza la MISMA validación de fecha de calendario real (rechaza
        // 2026-99-80, etc.) que ya usan los reportes contables.
        const { error: errorFecha, fecha_desde: fecha } = validarFiltroFechas({ fecha_desde: req.query.fecha });
        if (errorFecha) return res.status(errorFecha.status).json({ msg: errorFecha.msg });
        if (!fecha) return res.status(400).json({ msg: 'fecha es obligatoria (formato YYYY-MM-DD)' });

        const idSalaNum = parseInt(id_sala);
        const idUsuarioNum = parseInt(id_usuario);

        const { error, sala, alumno, empresa } = await resolverContexto(req, idSalaNum, idUsuarioNum);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const reporte = await construirReporteActividad(empresa.id_empresa, idUsuarioNum, fecha);

        res.json({
            filtros: { id_sala: idSalaNum, id_usuario: idUsuarioNum, fecha },
            alumno: { id_usuario: alumno.id_usuario, nombre: alumno.nombre, cedula: alumno.cedula },
            sala: { id_sala: sala.id_sala, sala: sala.sala, curso: sala.curso, semestre: sala.semestre },
            empresa: { id_empresa: empresa.id_empresa, nombre: empresa.nombre, ruc: empresa.ruc, sigla: empresa.sigla },
            ...reporte
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar el reporte de actividad del alumno' });
    }
};

const ESTADO_ONOFF = (estado) => (estado === 1 ? 'ACTIVO' : 'INACTIVO');

/** Combina imputada/estado de CompraVenta en una sola etiqueta clara para el PDF */
const ESTADO_COMPRAVENTA = (cv) => {
    if (cv.estado === 1 && cv.imputada === 'NO') return 'BORRADOR (NO IMPUTADA)';
    if (cv.estado === 1 && cv.imputada === 'SI') return 'IMPUTADA';
    if (cv.estado === 0 && cv.imputada === 'SI') return 'ANULADA';
    return 'DESACTIVADA';
};

export const reporteActividadAlumnoPDF = async (req, res) => {
    const { id_sala, id_usuario } = req.query;

    try {
        if (!id_sala || !Number.isInteger(Number(id_sala)) || Number(id_sala) <= 0) {
            return res.status(400).json({ msg: 'id_sala debe ser un entero positivo' });
        }
        if (!id_usuario || !Number.isInteger(Number(id_usuario)) || Number(id_usuario) <= 0) {
            return res.status(400).json({ msg: 'id_usuario debe ser un entero positivo' });
        }

        const { error: errorFecha, fecha_desde: fecha } = validarFiltroFechas({ fecha_desde: req.query.fecha });
        if (errorFecha) return res.status(errorFecha.status).json({ msg: errorFecha.msg });
        if (!fecha) return res.status(400).json({ msg: 'fecha es obligatoria (formato YYYY-MM-DD)' });

        const idSalaNum = parseInt(id_sala);
        const idUsuarioNum = parseInt(id_usuario);

        const { error, sala, alumno, empresa } = await resolverContexto(req, idSalaNum, idUsuarioNum);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const { sucursales, clientes, proveedores, cuentas, compras, ventas, asientos, movimientos } =
            await construirReporteActividad(empresa.id_empresa, idUsuarioNum, fecha);

        const hora = (fechaHora) => new Date(fechaHora).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const num = (v) => Number(v || 0).toLocaleString('es-PY');

        const sucursalesPlanas = sucursales.map(s => ({ codigo: s.codigo, nombre: s.nombre, responsable: s.responsable, telefono: s.telefono, estado: ESTADO_ONOFF(s.estado), hora: hora(s.createdAt) }));

        const clienteProveedorPlano = (cp) => ({
            razon_social: cp.razon_social,
            numero_identificacion: cp.numero_identificacion,
            ciudad: cp.Ciudad?.nombre || '—',
            telefono: cp.telefono || '—',
            estado: ESTADO_ONOFF(cp.estado),
            hora: hora(cp.createdAt)
        });
        const clientesPlanos = clientes.map(clienteProveedorPlano);
        const proveedoresPlanos = proveedores.map(clienteProveedorPlano);

        const cuentasPlanas = cuentas.map(c => ({
            codigo: c.codigo, nombre: c.nombre, nivel: c.nivel, naturaleza: c.naturaleza,
            asentable: c.asentable, codigo_padre: c.codigo_padre || '—', nombre_padre: c.nombre_padre || '—',
            estado: ESTADO_ONOFF(c.estado), hora: hora(c.createdAt)
        }));

        const compraVentaPlana = (cv) => ({
            numero_factura: cv.numero_factura, numero_timbrado: cv.numero_timbrado,
            tercero: cv.ClienteProveedor?.razon_social || '—',
            sucursal: cv.Sucursal?.nombre || '—',
            fecha_documento: cv.fecha,
            total_factura: num(cv.total_factura),
            exenta: num(cv.exenta), gravada10: num(cv.gravada10), gravada05: num(cv.gravada05),
            iva10: num(cv.importe_iva_10), iva05: num(cv.importe_iva_05),
            estado: ESTADO_COMPRAVENTA(cv), hora: hora(cv.createdAt)
        });
        const comprasPlanas = compras.map(compraVentaPlana);
        const ventasPlanas = ventas.map(compraVentaPlana);

        const asientosPlanos = asientos.map(a => ({
            numero_asiento: a.numero_asiento, fecha: a.fecha, concepto: a.concepto,
            tipo_asiento: a.tipo_asiento, sucursal: a.sucursal?.nombre || '—',
            id_compraventa: a.id_compraventa || '—', estado: (a.estado || '').toUpperCase(),
            hora: hora(a.createdAt),
            detalles: (a.asientoDetalles || []).map(d => ({
                codigo: d.empresaCuenta?.codigo || '', nombre: d.empresaCuenta?.nombre || '',
                debe: num(d.debe), haber: num(d.haber)
            }))
        }));

        const movimientosPlanos = movimientos.map(m => ({ hora: hora(m.createdAt), tipo: m.tipo, descripcion: m.descripcion, referencia_id: m.referencia_id ?? '—' }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reporteactividadalumno.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            sala: sala.sala,
            alumno: `${alumno.nombre} (CI ${alumno.cedula})`,
            empresa: empresa.nombre,
            ruc: empresa.ruc,
            fecha,
            resumen: {
                sucursales: sucursales.length, clientes: clientes.length, proveedores: proveedores.length,
                cuentas: cuentas.length, compras: compras.length, ventas: ventas.length,
                asientos: asientos.length, movimientos: movimientos.length
            },
            sucursales: sucursalesPlanas, clientes: clientesPlanos, proveedores: proveedoresPlanos,
            cuentas: cuentasPlanas, compras: comprasPlanas, ventas: ventasPlanas,
            asientos: asientosPlanos, movimientos: movimientosPlanos,
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        await generarYEnviarPdf(res, html, 'reporte_actividad_alumno');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del reporte de actividad del alumno' });
    }
};