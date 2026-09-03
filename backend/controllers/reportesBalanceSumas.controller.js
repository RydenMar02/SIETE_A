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

const SQL_BALANCE = `
    SELECT 
        ec.codigo AS codigo_cuenta,
        ec.nombre AS nombre_cuenta,
        SUM(ad.debe) AS suma_debe,
        SUM(ad.haber) AS suma_haber,
        CASE WHEN (SUM(ad.debe) - SUM(ad.haber)) > 0 THEN (SUM(ad.debe) - SUM(ad.haber)) ELSE 0 END AS saldo_deudor,
        CASE WHEN (SUM(ad.haber) - SUM(ad.debe)) > 0 THEN (SUM(ad.haber) - SUM(ad.debe)) ELSE 0 END AS saldo_acreedor
    FROM asiento_detalle ad
    JOIN empresa_cuenta ec ON ad.id_empresacuenta = ec.id_empresacuenta
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    WHERE ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      /*FILTRO_FECHA*/
    GROUP BY ec.id_empresacuenta, ec.codigo, ec.nombre
    ORDER BY ec.codigo
`;

export const getBalanceSumas = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el balance de esta empresa' });
        }

        const { error, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const { fragmento, replacements } = construirFiltroFechaSQL(fecha_desde, fecha_hasta);
        const sql = SQL_BALANCE.replace('/*FILTRO_FECHA*/', fragmento);

        const [resultados] = await db.query(sql, { replacements: { id_empresa: parseInt(id_empresa), ...replacements } });
        res.json({ total: resultados.length, filtro: { fecha_desde, fecha_hasta }, registros: resultados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener balance de sumas' });
    }
};

export const reporteBalanceSumasPDF = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el balance de esta empresa' });
        }

        const { error, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const { fragmento, replacements } = construirFiltroFechaSQL(fecha_desde, fecha_hasta);
        const sql = SQL_BALANCE.replace('/*FILTRO_FECHA*/', fragmento);

        const [resultados] = await db.query(sql, { replacements: { id_empresa: parseInt(id_empresa), ...replacements } });
        if (!resultados.length) return res.status(404).json({ msg: 'No hay registros para generar el balance' });

        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const registrosPlanos = resultados.map(r => ({
            codigo_cuenta: r.codigo_cuenta,
            nombre_cuenta: r.nombre_cuenta,
            suma_debe: Number(r.suma_debe || 0).toLocaleString('es-PY'),
            suma_haber: Number(r.suma_haber || 0).toLocaleString('es-PY'),
            saldo_deudor: Number(r.saldo_deudor || 0).toLocaleString('es-PY'),
            saldo_acreedor: Number(r.saldo_acreedor || 0).toLocaleString('es-PY')
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reportebalancesumas.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            empresa: empresa?.nombre || 'Sin empresa',
            registros: registrosPlanos,
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: parseInt(id_empresa),
            tipo: 'GENERO_PDF_BALANCE_SUMAS',
            descripcion: 'Generó el PDF del balance de sumas y saldos'
        });

        await generarYEnviarPdf(res, html, 'reporte_balance_sumas');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del balance' });
    }
};