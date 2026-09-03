import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { create } from 'express-handlebars';
import ClienteProveedor from '../models/clienteProveedor.js';
import Empresa from '../models/empresa.js';
import Ciudad from '../models/ciudad.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';
import { generarYEnviarPdf } from '../helpers/reportesHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

export const getClientesPorEmpresa = async (req, res) => {
    const { id_empresa } = req.query;
    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los clientes de esta empresa' });
        }
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
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los clientes de esta empresa' });
        }

        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

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
            empresa: empresa?.nombre || 'Sin empresa',
            marcaAgua: `${baseURL}/images/marcaAgua.png`,
            fcea: `${baseURL}/images/fcea.png`,
            unc: `${baseURL}/images/unc.png`
        });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: parseInt(id_empresa),
            tipo: 'GENERO_PDF_CLIENTES',
            descripcion: 'Generó el PDF del listado de clientes'
        });

        await generarYEnviarPdf(res, html, 'reporte_clientes');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar PDF de clientes' });
    }
};