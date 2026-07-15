import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { create } from 'express-handlebars';
import CompraVenta from '../models/compraVenta.js';
import ClienteProveedor from '../models/clienteProveedor.js';
import Sucursal from '../models/sucursal.js';
import Empresa from '../models/empresa.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

export const getVentasPorEmpresa = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        const registros = await CompraVenta.findAll({
            where: { estado: 1, tipo: 'VENTA' },
            include: [
                { model: ClienteProveedor, attributes: ['razon_social', 'numero_identificacion'], where: { id_empresa: parseInt(id_empresa) } },
                { model: Sucursal, attributes: ['nombre'] }
            ],
            order: [['fecha', 'DESC']]
        });
        res.json({ total: registros.length, registros });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener ventas' });
    }
};

export const reporteVentasPDF = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const registros = await CompraVenta.findAll({
            where: { estado: 1, tipo: 'VENTA' },
            include: [
                { model: ClienteProveedor, attributes: ['razon_social', 'numero_identificacion'], where: { id_empresa: parseInt(id_empresa) } },
                { model: Sucursal, attributes: ['nombre'] }
            ],
            order: [['fecha', 'DESC']]
        });

        const registrosPlanos = registros.map(r => ({
            numero_factura: r.numero_factura,
            numero_timbrado: r.numero_timbrado,
            tipo_de_factura: r.tipo_de_factura,
            condicion: r.condicion,
            fecha: r.fecha,
            total_factura: parseFloat(r.total_factura).toLocaleString('es-PY', { minimumFractionDigits: 0 }),
            cliente: r.ClienteProveedor?.razon_social || 'Sin cliente',
            ruc: r.ClienteProveedor?.numero_identificacion || 'S/N',
            sucursal: r.Sucursal?.nombre || 'Sin sucursal',
            concepto: r.concepto || '',
            moneda: r.moneda,
            exenta: r.exenta || 0,
            gravada10: r.gravada10 || 0,
            gravada05: r.gravada05 || 0
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reporteventas.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            registros: registrosPlanos,
            empresa: empresa?.nombre || 'Sin empresa',
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`
        });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const outputPath = join(__dirname, '../reports/reporte_ventas.pdf');
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_ventas.pdf');
        res.sendFile(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF de ventas' });
    }
};