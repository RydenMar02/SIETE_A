import { Op } from 'sequelize';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import Empresa from '../models/empresa.js';
import Sucursal from '../models/sucursal.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';
import { validarFiltroFechas, generarYEnviarPdf } from '../helpers/reportesHelper.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { create } from 'express-handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hbs = create();

hbs.handlebars.registerHelper('eq', (a, b) => a === b);

/** Arma el where de Sequelize con id_empresa + estado activo + rango de fecha opcional */
const construirWhereAsientos = (id_empresa, fecha_desde, fecha_hasta) => {
    const where = { id_empresa, estado: { [Op.ne]: 'anulado' } };
    if (fecha_desde && fecha_hasta) {
        where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
    } else if (fecha_desde) {
        where.fecha = { [Op.gte]: fecha_desde };
    } else if (fecha_hasta) {
        where.fecha = { [Op.lte]: fecha_hasta };
    }
    return where;
};

export const getAsientosPorEmpresa = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los asientos de esta empresa' });
        }

        const { error, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const asientos = await AsientoCabecera.findAll({
            where: construirWhereAsientos(parseInt(id_empresa), fecha_desde, fecha_hasta),
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

        res.json({ total: asientos.length, filtro: { fecha_desde, fecha_hasta }, asientos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener asientos' });
    }
};

export const reporteAsientosPDF = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) return res.status(400).json({ msg: 'Falta el parámetro id_empresa' });

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los asientos de esta empresa' });
        }

        const { error, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (error) return res.status(error.status).json({ msg: error.msg });

        const empresa = await Empresa.findByPk(id_empresa, { attributes: ['nombre'] });

        const asientos = await AsientoCabecera.findAll({
            where: construirWhereAsientos(parseInt(id_empresa), fecha_desde, fecha_hasta),
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

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: parseInt(id_empresa),
            tipo: 'GENERO_PDF_ASIENTOS',
            descripcion: 'Generó el PDF del reporte de asientos'
        });

        await generarYEnviarPdf(res, html, 'reporte_asientos');
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al generar reporte de asientos' });
    }
};