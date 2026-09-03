import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { create } from 'express-handlebars';
import db from '../db/conexion.js';
import Empresa from '../models/empresa.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';
import { validarFiltroFechas, construirFiltroFechaSQL, generarYEnviarPdf } from '../helpers/reportesHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

// Saldo de todos los movimientos válidos ANTERIORES a fecha_desde, para
// arrancar el saldo acumulado desde el punto correcto cuando se consulta
// un rango que no empieza desde el origen de la cuenta.
const SQL_SALDO_INICIAL = `
    SELECT
        COALESCE(SUM(ad.debe), 0) AS suma_debe,
        COALESCE(SUM(ad.haber), 0) AS suma_haber
    FROM asiento_detalle ad
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    WHERE ad.id_empresacuenta = :id_empresacuenta
      AND ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      AND ac.fecha < :fecha_desde
`;

// Movimientos cronológicos de la cuenta dentro del rango pedido (o de toda
// su historia si no vienen fechas).
const SQL_MOVIMIENTOS = `
    SELECT
        ac.id_asiento, ac.numero_asiento, ac.fecha, ac.documento, ac.concepto,
        ad.debe, ad.haber
    FROM asiento_detalle ad
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    WHERE ad.id_empresacuenta = :id_empresacuenta
      AND ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      /*FILTRO_FECHA*/
    ORDER BY ac.fecha ASC, ac.id_asiento ASC, ad.id_detalle ASC
`;

/**
 * Valida que la cuenta exista y pertenezca a la empresa consultada -cierra
 * el riesgo IDOR de usar una cuenta de otra empresa para pedir su Mayor.
 * Devuelve { error } o { cuenta }.
 */
const validarCuentaDelMayor = async (id_empresacuenta, id_empresa) => {
    const cuenta = await EmpresaCuenta.findByPk(id_empresacuenta);
    if (!cuenta) {
        return { error: { status: 404, msg: 'La cuenta indicada no existe' } };
    }
    if (cuenta.id_empresa !== id_empresa) {
        return { error: { status: 403, msg: 'La cuenta indicada no pertenece a esta empresa' } };
    }
    return { cuenta };
};

/**
 * Arma el Libro Mayor completo (saldo inicial + movimientos con saldo
 * acumulado + saldo final) de una cuenta ya validada. Reusado por el JSON
 * y por el PDF para no duplicar la lógica de cálculo.
 */
const construirLibroMayor = async (cuenta, id_empresa, fecha_desde, fecha_hasta) => {
    let saldo_inicial = 0;
    if (fecha_desde) {
        const [[filaSaldoInicial]] = await db.query(SQL_SALDO_INICIAL, {
            replacements: { id_empresacuenta: cuenta.id_empresacuenta, id_empresa, fecha_desde }
        });
        const debe = parseFloat(filaSaldoInicial.suma_debe) || 0;
        const haber = parseFloat(filaSaldoInicial.suma_haber) || 0;
        saldo_inicial = cuenta.naturaleza === 'ACREEDORA' ? (haber - debe) : (debe - haber);
    }

    const { fragmento, replacements } = construirFiltroFechaSQL(fecha_desde, fecha_hasta);
    const sqlMovimientos = SQL_MOVIMIENTOS.replace('/*FILTRO_FECHA*/', fragmento);
    const [filas] = await db.query(sqlMovimientos, {
        replacements: { id_empresacuenta: cuenta.id_empresacuenta, id_empresa, ...replacements }
    });

    let saldoCorriente = saldo_inicial;
    const movimientos = filas.map(f => {
        const debe = parseFloat(f.debe) || 0;
        const haber = parseFloat(f.haber) || 0;
        saldoCorriente += cuenta.naturaleza === 'ACREEDORA' ? (haber - debe) : (debe - haber);
        return {
            id_asiento: f.id_asiento,
            numero_asiento: f.numero_asiento,
            fecha: f.fecha,
            documento: f.documento,
            concepto: f.concepto,
            debe,
            haber,
            saldo: saldoCorriente
        };
    });

    return { saldo_inicial, movimientos, saldo_final: saldoCorriente };
};

export const getLibroMayor = async (req, res) => {
    const { id_empresa, id_empresacuenta } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!id_empresacuenta) return res.status(400).json({ msg: 'Falta el parámetro id_empresacuenta' });

        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el libro mayor de esta empresa' });
        }

        const { error: errorCuenta, cuenta } = await validarCuentaDelMayor(parseInt(id_empresacuenta), idEmpresaNum);
        if (errorCuenta) return res.status(errorCuenta.status).json({ msg: errorCuenta.msg });

        const { error: errorFechas, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (errorFechas) return res.status(errorFechas.status).json({ msg: errorFechas.msg });

        const { saldo_inicial, movimientos, saldo_final } = await construirLibroMayor(cuenta, idEmpresaNum, fecha_desde, fecha_hasta);

        res.json({
            cuenta: {
                id_empresacuenta: cuenta.id_empresacuenta,
                codigo: cuenta.codigo,
                nombre: cuenta.nombre,
                naturaleza: cuenta.naturaleza
            },
            filtro: { fecha_desde, fecha_hasta },
            saldo_inicial,
            movimientos,
            saldo_final
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener libro mayor' });
    }
};

export const reporteLibroMayorPDF = async (req, res) => {
    const { id_empresa, id_empresacuenta } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!id_empresacuenta) return res.status(400).json({ msg: 'Falta el parámetro id_empresacuenta' });

        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el libro mayor de esta empresa' });
        }

        const { error: errorCuenta, cuenta } = await validarCuentaDelMayor(parseInt(id_empresacuenta), idEmpresaNum);
        if (errorCuenta) return res.status(errorCuenta.status).json({ msg: errorCuenta.msg });

        const { error: errorFechas, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (errorFechas) return res.status(errorFechas.status).json({ msg: errorFechas.msg });

        const { saldo_inicial, movimientos, saldo_final } = await construirLibroMayor(cuenta, idEmpresaNum, fecha_desde, fecha_hasta);

        if (!movimientos.length && saldo_inicial === 0) {
            return res.status(404).json({ msg: 'No hay movimientos para generar el libro mayor de esta cuenta' });
        }

        const empresa = await Empresa.findByPk(idEmpresaNum, { attributes: ['nombre'] });

        const movimientosPlanos = movimientos.map(m => ({
            fecha: new Date(m.fecha).toLocaleDateString('es-PY'),
            numero_asiento: m.numero_asiento,
            documento: m.documento || '—',
            concepto: m.concepto || '—',
            debe: m.debe > 0 ? m.debe.toLocaleString('es-PY') : '',
            haber: m.haber > 0 ? m.haber.toLocaleString('es-PY') : '',
            saldo: m.saldo.toLocaleString('es-PY')
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reportelibromayor.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            empresa: empresa?.nombre || 'Sin empresa',
            cuenta: { codigo: cuenta.codigo, nombre: cuenta.nombre },
            saldo_inicial: saldo_inicial.toLocaleString('es-PY'),
            movimientos: movimientosPlanos,
            saldo_final: saldo_final.toLocaleString('es-PY'),
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: idEmpresaNum,
            tipo: 'GENERO_PDF_LIBRO_MAYOR',
            descripcion: `Generó el PDF del libro mayor de la cuenta ${cuenta.codigo}`
        });

        await generarYEnviarPdf(res, html, 'reporte_libro_mayor');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del libro mayor' });
    }
};