import { randomUUID } from 'crypto';
import { unlink, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, '../reports');
const PUBLIC_IMAGES_DIR = join(__dirname, '../public/images');

// Timeout de navegación explícito. Es una red de seguridad SECUNDARIA, no
// la solución: con las imágenes embebidas como base64 (ver más abajo) y
// waitUntil:'domcontentloaded', el render de un HTML ya armado no debería
// acercarse ni de lejos a este número -si lo alcanza, es señal de un
// problema real, no de una espera de red normal.
const TIMEOUT_NAVEGACION_MS = 15000;

const MIME_POR_EXTENSION = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
const cacheImagenesBase64 = new Map();

/**
 * Lee una imagen de /public/images (única fuente real de imágenes usada
 * por los templates de reportes) y la devuelve como data URI base64,
 * cacheada en memoria -son 3 archivos fijos que no cambian en caliente,
 * así que se leen del disco una sola vez por proceso.
 */
const obtenerImagenBase64 = async (nombreArchivo) => {
    if (cacheImagenesBase64.has(nombreArchivo)) {
        return cacheImagenesBase64.get(nombreArchivo);
    }
    const extension = nombreArchivo.split('.').pop().toLowerCase();
    const mime = MIME_POR_EXTENSION[extension] || 'application/octet-stream';
    const buffer = await readFile(join(PUBLIC_IMAGES_DIR, nombreArchivo));
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    cacheImagenesBase64.set(nombreArchivo, dataUri);
    return dataUri;
};

/**
 * Reemplaza cualquier <img src="http://.../images/archivo.png"> del HTML
 * por su versión embebida en base64, leyendo el archivo directamente de
 * /public/images. Esta es la causa real del TimeoutError: Puppeteer tenía
 * que hacer un request HTTP de vuelta al propio servidor para traer el
 * encabezado y la marca de agua, y esa espera de red (bajo waitUntil:
 * 'networkidle0') es lo que superaba los 30 segundos. Con la imagen ya
 * embebida en el HTML no hace falta ningún request de red para renderizar.
 * Si por algún motivo una imagen puntual no se puede leer, se deja su URL
 * original en vez de romper la generación completa del PDF.
 */
const embeberImagenesLocales = async (html) => {
    const regexImagenes = /src="[^"]*\/images\/([a-zA-Z0-9_-]+\.(?:png|jpe?g|gif|svg))"/gi;
    const nombresEncontrados = [...html.matchAll(regexImagenes)].map(m => m[1]);
    const nombresUnicos = [...new Set(nombresEncontrados)];

    let htmlConImagenes = html;
    for (const nombreArchivo of nombresUnicos) {
        try {
            const dataUri = await obtenerImagenBase64(nombreArchivo);
            htmlConImagenes = htmlConImagenes.replaceAll(
                new RegExp(`src="[^"]*/images/${nombreArchivo}"`, 'g'),
                `src="${dataUri}"`
            );
        } catch (error) {
            console.error(`No se pudo embeber la imagen ${nombreArchivo}, se deja como URL externa:`, error.message);
        }
    }
    return htmlConImagenes;
};

/**
 * Valida los query params fecha_desde/fecha_hasta (formato YYYY-MM-DD,
 * fecha de calendario real, y fecha_desde <= fecha_hasta). Devuelve
 * { error } si algo falla, o { fecha_desde, fecha_hasta } (cualquiera
 * puede ser null si no vino) si todo está OK. No toca la BD -es
 * validación pura.
 */
export const validarFiltroFechas = (query) => {
    const fecha_desde = query.fecha_desde || null;
    const fecha_hasta = query.fecha_hasta || null;

    if (fecha_desde && !esFechaCalendarioValida(fecha_desde)) {
        return { error: { status: 400, msg: 'fecha_desde debe ser una fecha real en formato YYYY-MM-DD' } };
    }
    if (fecha_hasta && !esFechaCalendarioValida(fecha_hasta)) {
        return { error: { status: 400, msg: 'fecha_hasta debe ser una fecha real en formato YYYY-MM-DD' } };
    }
    if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
        return { error: { status: 400, msg: 'fecha_desde no puede ser posterior a fecha_hasta' } };
    }

    return { fecha_desde, fecha_hasta };
};

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Valida que un string sea una fecha de calendario REAL, no solo con forma
 * YYYY-MM-DD. Un regex de forma solo no alcanza: JS "normaliza" fechas
 * imposibles (new Date('2026-02-31') se convierte silenciosamente en el
 * 3 de marzo) en vez de rechazarlas, así que hay que comparar los
 * componentes de vuelta contra lo que efectivamente se pidió.
 */
const esFechaCalendarioValida = (fecha) => {
    const match = FORMATO_FECHA.exec(fecha);
    if (!match) return false;
    const anio = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
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
 *
 * Las imágenes locales del HTML se embeben como base64 antes de
 * renderizar, así que ya no depende de esperar red externa: por eso
 * waitUntil pasa de 'networkidle0' a 'domcontentloaded'.
 */
export const generarYEnviarPdf = async (res, html, prefijoArchivo) => {
    const outputPath = join(REPORTS_DIR, `${prefijoArchivo}_${randomUUID()}.pdf`);
    const htmlConImagenes = await embeberImagenesLocales(html);

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(TIMEOUT_NAVEGACION_MS);
        await page.setContent(htmlConImagenes, { waitUntil: 'domcontentloaded' });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });
    } catch (error) {
        console.error('Error generando PDF:', error);
        throw error; // el controller ya tiene su propio catch/500 -no duplicamos la respuesta acá
    } finally {
        if (browser) {
            await browser.close();
        }
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