import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { create } from 'express-handlebars';
import ClienteProveedor from '../models/clienteProveedor.js';
import Empresa from '../models/empresa.js';
import Ciudad from '../models/ciudad.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

export const getClientesPorEmpresa = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        const registros = await ClienteProveedor.findAll({
            where: { estado: 1, id_empresa: parseInt(id_empresa), tipo: 'CLIENTE' },
            include: [{ model: Empresa, attributes: ['nombre'] }, { model: Ciudad, attributes: ['nombre'] }],
            order: [['razon_social', 'ASC']]
        });
        res.json({ total: registros.length, registros });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener clientes' });
    }
};

export const reporteClientesPDF = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        const registros = await ClienteProveedor.findAll({
            where: { estado: 1, id_empresa: parseInt(id_empresa), tipo: 'CLIENTE' },
            include: [{ model: Empresa, attributes: ['nombre'] }, { model: Ciudad, attributes: ['nombre'] }],
            order: [['razon_social', 'ASC']]
        });

        const registrosPlanos = registros.map(r => ({
            numero_identificacion: r.numero_identificacion,
            razon_social: r.razon_social,
            direccion: r.direccion,
            telefono: r.telefono,
            correo: r.correo,
            ciudad: r.Ciudad?.nombre || 'Sin ciudad',
            empresa: r.Empresa?.nombre || 'Sin nombre'
        }));

        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const templateSource = readFileSync(join(__dirname, '../views/reporteclientes.handlebars'), 'utf-8');
        const html = hbs.handlebars.compile(templateSource)({
            registros: registrosPlanos,
            empresa: registros[0]?.Empresa?.nombre || 'Sin empresa',
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`
        });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const outputPath = join(__dirname, '../reports/reporte_clientes.pdf');
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_clientes.pdf');
        res.sendFile(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF de clientes' });
    }
};