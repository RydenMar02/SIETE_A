import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { create } from 'express-handlebars';
import db from '../db/conexion.js';
import Empresa from '../models/empresa.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';
import { validarFiltroFechas, construirFiltroFechaSQL, generarYEnviarPdf } from '../helpers/reportesHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

// Saldo de todos los movimientos válidos ANTERIORES a fecha_desde, por
// CADA cuenta de la empresa, para arrancar el saldo acumulado de cada una
// desde el punto correcto cuando se consulta un rango que no empieza
// desde el origen de la cuenta.
const SQL_SALDO_INICIAL = `
    SELECT
        ec.id_empresacuenta,
        COALESCE(SUM(ad.debe), 0) AS suma_debe,
        COALESCE(SUM(ad.haber), 0) AS suma_haber
    FROM asiento_detalle ad
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    JOIN empresa_cuenta ec ON ec.id_empresacuenta = ad.id_empresacuenta
    WHERE ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      AND ac.fecha < :fecha_desde
    GROUP BY ec.id_empresacuenta
`;

// Movimientos cronológicos de TODAS las cuentas de la empresa que tengan
// movimiento dentro del rango pedido (o de toda su historia si no vienen
// fechas), ordenados primero por cuenta (código) y dentro de cada cuenta
// cronológicamente.
const SQL_MOVIMIENTOS = `
    SELECT
        ec.id_empresacuenta, ec.codigo, ec.nombre, ec.naturaleza,
        ac.id_asiento, ac.numero_asiento, ac.fecha, ac.documento, ac.concepto,
        ad.id_detalle, ad.debe, ad.haber
    FROM asiento_detalle ad
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    JOIN empresa_cuenta ec ON ec.id_empresacuenta = ad.id_empresacuenta
    WHERE ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      /*FILTRO_FECHA*/
    ORDER BY ec.codigo ASC, ac.fecha ASC, ac.id_asiento ASC, ad.id_detalle ASC
`;

/**
 * Arma el Libro Mayor GENERAL de una empresa: todas las cuentas con
 * movimiento (dentro del rango pedido), cada una con su saldo inicial +
 * movimientos con saldo acumulado + saldo final. Reusado por el JSON y
 * por el PDF para no duplicar la lógica de cálculo.
 *
 * Nota de diseño: si una cuenta tuvo movimiento ANTES de fecha_desde pero
 * ninguno DENTRO del rango pedido, no aparece en el resultado -mismo
 * criterio que "no hace falta mostrar cuentas sin movimiento" aplicado al
 * rango consultado, no solo a toda la historia.
 */
const construirLibroMayorGeneral = async (id_empresa, fecha_desde, fecha_hasta) => {
    const saldosInicialesPorCuenta = new Map();
    if (fecha_desde) {
        const [filasSaldoInicial] = await db.query(SQL_SALDO_INICIAL, {
            replacements: { id_empresa, fecha_desde }
        });
        for (const fila of filasSaldoInicial) {
            saldosInicialesPorCuenta.set(fila.id_empresacuenta, {
                debe: parseFloat(fila.suma_debe) || 0,
                haber: parseFloat(fila.suma_haber) || 0
            });
        }
    }

    const { fragmento, replacements } = construirFiltroFechaSQL(fecha_desde, fecha_hasta);
    const sqlMovimientos = SQL_MOVIMIENTOS.replace('/*FILTRO_FECHA*/', fragmento);
    const [filas] = await db.query(sqlMovimientos, {
        replacements: { id_empresa, ...replacements }
    });

    // Las filas ya vienen ordenadas por codigo/fecha/id_asiento/id_detalle,
    // así que agrupar en el orden en que aparecen preserva ese orden.
    const cuentasMap = new Map();
    for (const fila of filas) {
        if (!cuentasMap.has(fila.id_empresacuenta)) {
            const previo = saldosInicialesPorCuenta.get(fila.id_empresacuenta);
            const saldo_inicial = previo
                ? (fila.naturaleza === 'ACREEDORA' ? (previo.haber - previo.debe) : (previo.debe - previo.haber))
                : 0;

            cuentasMap.set(fila.id_empresacuenta, {
                id_empresacuenta: fila.id_empresacuenta,
                codigo: fila.codigo,
                nombre: fila.nombre,
                naturaleza: fila.naturaleza,
                saldo_inicial,
                saldoCorriente: saldo_inicial,
                movimientos: []
            });
        }

        const cuenta = cuentasMap.get(fila.id_empresacuenta);
        const debe = parseFloat(fila.debe) || 0;
        const haber = parseFloat(fila.haber) || 0;
        cuenta.saldoCorriente += cuenta.naturaleza === 'ACREEDORA' ? (haber - debe) : (debe - haber);

        cuenta.movimientos.push({
            id_asiento: fila.id_asiento,
            numero_asiento: fila.numero_asiento,
            fecha: fila.fecha,
            documento: fila.documento,
            concepto: fila.concepto,
            debe,
            haber,
            saldo: cuenta.saldoCorriente
        });
    }

    return Array.from(cuentasMap.values()).map(c => ({
        id_empresacuenta: c.id_empresacuenta,
        codigo: c.codigo,
        nombre: c.nombre,
        naturaleza: c.naturaleza,
        saldo_inicial: c.saldo_inicial,
        movimientos: c.movimientos,
        saldo_final: c.saldoCorriente
    }));
};

export const getLibroMayor = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el libro mayor de esta empresa' });
        }

        const empresa = await Empresa.findByPk(idEmpresaNum, { attributes: ['id_empresa', 'nombre', 'ruc', 'sigla'] });
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }

        const { error: errorFechas, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (errorFechas) return res.status(errorFechas.status).json({ msg: errorFechas.msg });

        const cuentas = await construirLibroMayorGeneral(idEmpresaNum, fecha_desde, fecha_hasta);

        res.json({
            empresa,
            filtro: { fecha_desde, fecha_hasta },
            cuentas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener libro mayor' });
    }
};

export const reporteLibroMayorPDF = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el libro mayor de esta empresa' });
        }

        const empresa = await Empresa.findByPk(idEmpresaNum, { attributes: ['nombre', 'ruc', 'sigla'] });
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }

        const { error: errorFechas, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (errorFechas) return res.status(errorFechas.status).json({ msg: errorFechas.msg });

        const cuentas = await construirLibroMayorGeneral(idEmpresaNum, fecha_desde, fecha_hasta);

        if (cuentas.length === 0) {
            return res.status(404).json({ msg: 'No hay movimientos para generar el libro mayor de esta empresa' });
        }

        const cuentasPlanas = cuentas.map(c => ({
            codigo: c.codigo,
            nombre: c.nombre,
            naturaleza: c.naturaleza,
            saldo_inicial: c.saldo_inicial.toLocaleString('es-PY'),
            saldo_final: c.saldo_final.toLocaleString('es-PY'),
            movimientos: c.movimientos.map(m => ({
                fecha: new Date(m.fecha).toLocaleDateString('es-PY'),
                numero_asiento: m.numero_asiento,
                documento: m.documento || '—',
                concepto: m.concepto || '—',
                debe: m.debe > 0 ? m.debe.toLocaleString('es-PY') : '',
                haber: m.haber > 0 ? m.haber.toLocaleString('es-PY') : '',
                saldo: m.saldo.toLocaleString('es-PY')
            }))
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reportelibromayor.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            empresa: empresa?.nombre || 'Sin empresa',
            ruc: empresa?.ruc || '',
            fecha_desde,
            fecha_hasta,
            cuentas: cuentasPlanas,
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: idEmpresaNum,
            tipo: 'GENERO_PDF_LIBRO_MAYOR',
            descripcion: `Generó el PDF del libro mayor general (${cuentas.length} cuentas)`
        });

        await generarYEnviarPdf(res, html, 'reporte_libro_mayor');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del libro mayor' });
    }
};