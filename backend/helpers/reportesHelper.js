import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, '../reports');

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida los query params fecha_desde/fecha_hasta (formato YYYY-MM-DD y
 * fecha_desde <= fecha_hasta). Devuelve { error } si algo falla, o
 * { fecha_desde, fecha_hasta } (cualquiera puede ser null si no vino) si
 * todo está OK. No toca la BD -es validación pura.
 */
export const validarFiltroFechas = (query) => {
    const fecha_desde = query.fecha_desde || null;
    const fecha_hasta = query.fecha_hasta || null;

    if (fecha_desde && !FORMATO_FECHA.test(fecha_desde)) {
        return { error: { status: 400, msg: 'fecha_desde debe tener formato YYYY-MM-DD' } };
    }
    if (fecha_hasta && !FORMATO_FECHA.test(fecha_hasta)) {
        return { error: { status: 400, msg: 'fecha_hasta debe tener formato YYYY-MM-DD' } };
    }
    if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
        return { error: { status: 400, msg: 'fecha_desde no puede ser posterior a fecha_hasta' } };
    }

    return { fecha_desde, fecha_hasta };
};

/**
 * Arma el fragmento SQL de filtro por fecha (y sus replacements) para
 * agregar a una consulta cruda que ya tenga un placeholder /*FILTRO_FECHA*\/.
 * Siempre parametrizado -nunca concatena las fechas directo en el string.
 */
export const construirFiltroFechaSQL = (fecha_desde, fecha_hasta, alias = 'ac') => {
    if (fecha_desde && fecha_hasta) {
        return {
            fragmento: `AND ${alias}.fecha BETWEEN :fecha_desde AND :fecha_hasta`,
            replacements: { fecha_desde, fecha_hasta }
        };
    }
    if (fecha_desde) {
        return { fragmento: `AND ${alias}.fecha >= :fecha_desde`, replacements: { fecha_desde } };
    }
    if (fecha_hasta) {
        return { fragmento: `AND ${alias}.fecha <= :fecha_hasta`, replacements: { fecha_hasta } };
    }
    return { fragmento: '', replacements: {} };
};

/**
 * Genera un PDF a partir de HTML ya renderizado con un nombre de archivo
 * ÚNICO por request (prefijo + crypto.randomUUID()), evitando que dos
 * requests concurrentes (misma empresa u otra) colisionen o se pisen el
 * archivo. Lo envía como respuesta y borra el temporal apenas Express
 * termina de enviarlo -exitoso o no-, sin dejar acumulación en /reports.
 * El nombre visible para quien descarga (Content-Disposition) sigue siendo
 * el nombre limpio de siempre; el UUID solo vive en el archivo físico.
 */
export const generarYEnviarPdf = async (res, html, prefijoArchivo) => {
    const outputPath = join(REPORTS_DIR, `${prefijoArchivo}_${randomUUID()}.pdf`);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });
    } finally {
        await browser.close();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${prefijoArchivo}.pdf`);

    res.sendFile(outputPath, (err) => {
        // Limpieza best-effort: corre siempre, haya salido bien o mal el envío.
        unlink(outputPath).catch(() => {});
        if (err && !res.headersSent) {
            console.error(err);
            res.status(500).json({ msg: 'Error al enviar el PDF' });
        }
    });
};