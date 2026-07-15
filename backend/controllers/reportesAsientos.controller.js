import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import Handlebars from 'express-handlebars';
import { create } from 'express-handlebars';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import Empresa from '../models/empresa.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

hbs.handlebars.registerHelper('eq', (a, b) => a === b);

export const getAsientosPorEmpresa = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        const asientos = await AsientoCabecera.findAll({
            where: { id_empresa: parseInt(id_empresa) },
            include: [
                { model: Empresa, as: 'empresa', attributes: ['nombre'] },
                { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
                {
                    model: AsientoDetalle,
                    as: 'asientoDetalles',
                    include: [{ model: EmpresaCuenta, as: 'empresaCuenta', attributes: ['codigo', 'nombre', 'naturaleza'] }]
                }
            ],
            order: [['fecha', 'DESC'], ['numero_asiento', 'ASC']]
        });

        res.json({ total: asientos.length, asientos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener asientos' });
    }
};

export const reporteAsientosPDF = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const asientos = await AsientoCabecera.findAll({
            where: { id_empresa: parseInt(id_empresa) },
            include: [
                { model: Empresa, as: 'empresa', attributes: ['nombre'] },
                { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
                {
                    model: AsientoDetalle,
                    as: 'asientoDetalles',
                    include: [{ model: EmpresaCuenta, as: 'empresaCuenta', attributes: ['codigo', 'nombre', 'naturaleza'] }]
                }
            ],
            order: [['fecha', 'DESC'], ['numero_asiento', 'ASC']]
        });

        const registrosPlanos = asientos.map(a => {
            let aumentaron = 0, disminuyeron = 0;
            const detalles = a.asientoDetalles.map(d => {
                const naturaleza = d.empresaCuenta?.naturaleza || '—';
                let movimiento = '—';
                if (naturaleza === 'DEUDORA') {
                    if (parseFloat(d.debe || 0) > 0) movimiento = 'AUMENTÓ';
                    if (parseFloat(d.haber || 0) > 0) movimiento = 'DISMINUYÓ';
                } else if (naturaleza === 'ACREEDORA') {
                    if (parseFloat(d.haber || 0) > 0) movimiento = 'AUMENTÓ';
                    if (parseFloat(d.debe || 0) > 0) movimiento = 'DISMINUYÓ';
                }
                if (movimiento === 'AUMENTÓ') aumentaron++;
                if (movimiento === 'DISMINUYÓ') disminuyeron++;
                return {
                    codigo: d.empresaCuenta?.codigo || '',
                    cuenta: d.empresaCuenta?.nombre || '',
                    naturaleza,
                    debe: parseFloat(d.debe || 0) > 0 ? parseFloat(d.debe).toLocaleString('es-PY') : '',
                    haber: parseFloat(d.haber || 0) > 0 ? parseFloat(d.haber).toLocaleString('es-PY') : '',
                    movimiento
                };
            });
            return {
                numero_asiento: a.numero_asiento,
                fecha: a.fecha,
                tipo: a.tipo_asiento,
                documento: a.documento || '—',
                sucursal: a.sucursal?.nombre || 'Sin sucursal',
                concepto: a.concepto || '—',
                total_debe: parseFloat(a.total_debe).toLocaleString('es-PY'),
                total_haber: parseFloat(a.total_haber).toLocaleString('es-PY'),
                detalles,
                resumen: { aumentaron, disminuyeron }
            };
        });

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const filePath = join(__dirname, '../views/reporteasientos.handlebars');
        const templateSource = readFileSync(filePath, 'utf-8');
        const template = hbs.handlebars.compile(templateSource);

        const html = template({
            registros: registrosPlanos,
            empresa: empresa?.nombre || 'Sin empresa',
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`,
            fecha_generacion: new Date().toLocaleString('es-PY')
        });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const outputPath = join(__dirname, '../reports/reporte_asientos.pdf');
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_asientos.pdf');
        res.sendFile(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar reporte de asientos' });
    }
};