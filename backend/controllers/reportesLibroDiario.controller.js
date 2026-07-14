import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { create } from 'express-handlebars';
import db from '../db/conexion.js';
import Empresa from '../models/empresa.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

const SQL_LIBRO_DIARIO = `
    SELECT 
        ac.numero_asiento, ac.fecha, ec.nombre AS cuenta,
        ac.concepto, ad.debe, ad.haber
    FROM asiento_detalle ad
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    JOIN empresa_cuenta ec ON ad.id_empresacuenta = ec.id_empresacuenta
    WHERE ac.id_empresa = :id_empresa
    ORDER BY ac.fecha, ac.numero_asiento, ec.codigo
`;

export const getLibroDiario = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        const [resultados] = await db.query(SQL_LIBRO_DIARIO, { replacements: { id_empresa: parseInt(id_empresa) } });
        res.json({ total: resultados.length, registros: resultados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener libro diario' });
    }
};

export const reporteLibroDiarioPDF = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        const [resultados] = await db.query(SQL_LIBRO_DIARIO, { replacements: { id_empresa: parseInt(id_empresa) } });
        if (!resultados.length) return res.status(404).json({ msg: 'No hay registros para generar el libro diario' });

        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const asientos = [];
        let actual = null;
        resultados.forEach(r => {
            if (!actual || actual.numero_asiento !== r.numero_asiento) {
                actual = { numero_asiento: r.numero_asiento, fecha: new Date(r.fecha).toLocaleDateString('es-PY'), concepto: r.concepto, detalles: [], totalDebe: 0, totalHaber: 0 };
                asientos.push(actual);
            }
            const debe = Number(r.debe || 0);
            const haber = Number(r.haber || 0);
            actual.detalles.push({ cuenta: r.cuenta, debe: debe.toLocaleString('es-PY'), haber: haber.toLocaleString('es-PY') });
            actual.totalDebe += debe;
            actual.totalHaber += haber;
        });
        asientos.forEach(a => { a.totalDebe = a.totalDebe.toLocaleString('es-PY'); a.totalHaber = a.totalHaber.toLocaleString('es-PY'); });

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reportelibrodiario.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            empresa: empresa?.nombre || 'Sin empresa',
            asientos,
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const outputPath = join(__dirname, '../reports/reporte_libro_diario.pdf');
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_libro_diario.pdf');
        res.sendFile(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del libro diario' });
    }
};