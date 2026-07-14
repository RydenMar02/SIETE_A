import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { create } from 'express-handlebars';
import db from '../db/conexion.js';
import Empresa from '../models/empresa.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

const SQL_LIBRO_MAYOR = `
    SELECT  
        ec.codigo AS codigo_cuenta,
        ec.nombre AS nombre_cuenta,
        SUM(ad.debe) AS total_debe,
        SUM(ad.haber) AS total_haber,
        (SUM(ad.debe) - SUM(ad.haber)) AS saldo
    FROM asiento_detalle ad
    JOIN empresa_cuenta ec ON ad.id_empresacuenta = ec.id_empresacuenta
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    WHERE ac.id_empresa = :id_empresa
    GROUP BY ec.id_empresacuenta, ec.codigo, ec.nombre
    ORDER BY ec.codigo
`;

export const getLibroMayor = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        const [resultados] = await db.query(SQL_LIBRO_MAYOR, { replacements: { id_empresa: parseInt(id_empresa) } });
        res.json({ total: resultados.length, registros: resultados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener libro mayor' });
    }
};

export const reporteLibroMayorPDF = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        const [resultados] = await db.query(SQL_LIBRO_MAYOR, { replacements: { id_empresa: parseInt(id_empresa) } });
        if (!resultados.length) return res.status(404).json({ msg: 'No hay registros para generar el libro mayor' });

        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const registrosPlanos = resultados.map(r => ({
            codigo_cuenta: r.codigo_cuenta,
            nombre_cuenta: r.nombre_cuenta,
            total_debe: Number(r.total_debe || 0).toLocaleString('es-PY'),
            total_haber: Number(r.total_haber || 0).toLocaleString('es-PY'),
            saldo: Number(r.saldo || 0).toLocaleString('es-PY')
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reportelibromayor.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            empresa: empresa?.nombre || 'Sin empresa',
            registros: registrosPlanos,
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const outputPath = join(__dirname, '../reports/reporte_libro_mayor.pdf');
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_libro_mayor.pdf');
        res.sendFile(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF del libro mayor' });
    }
};