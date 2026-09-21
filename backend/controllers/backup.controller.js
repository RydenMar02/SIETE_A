import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

/** SIETE_A_backup_2026-09-17_2150.sql -fecha/hora del servidor, sin depender de ninguna librería. */
const nombreArchivoBackup = (fecha) => {
    const pad = (n) => String(n).padStart(2, '0');
    const anio = fecha.getFullYear();
    const mes = pad(fecha.getMonth() + 1);
    const dia = pad(fecha.getDate());
    const hora = pad(fecha.getHours());
    const minuto = pad(fecha.getMinutes());
    return `SIETE_A_backup_${anio}-${mes}-${dia}_${hora}${minuto}.sql`;
};

/**
 * GET /api/backup
 * Genera un dump completo (estructura + datos + PK/FK/índices/AUTO_INCREMENT)
 * de la base real vía `mysqldump`, y lo entrega como archivo .sql descargable.
 *
 * Flujo: mysqldump escribe a un archivo temporal en el directorio temporal
 * del sistema operativo (nunca dentro del proyecto, nunca en una carpeta
 * servida públicamente) -> se espera el código de salida -> si fue 0, se
 * envía el archivo con res.download() -> se borra el temporal en el
 * callback, pase lo que pase con el envío.
 *
 * La contraseña de MySQL viaja por la variable de entorno MYSQL_PWD, nunca
 * como argumento de línea de comandos (que quedaría visible en la lista de
 * procesos del sistema operativo para cualquier usuario local), y nunca se
 * imprime en logs ni se devuelve al cliente.
 */
export const generarBackup = async (req, res) => {
    const rutaTemporal = join(tmpdir(), `siete_a_backup_${randomUUID()}.sql`);
    const nombreDescarga = nombreArchivoBackup(new Date());

    // Permite indicar la ruta completa del ejecutable si mysqldump no está
    // en el PATH (típico en Windows) -opcional, no se exige ni se asume
    // ninguna ruta personal.
    const mysqldumpBin = process.env.MYSQLDUMP_PATH || 'mysqldump';

    const args = [
        '-h', process.env.DB_HOST,
        '-P', String(process.env.DB_PORT),
        '-u', process.env.DB_USER,
        '--single-transaction',   // snapshot consistente en InnoDB, sin bloquear tablas
        '--routines',
        '--triggers',
        '--events',
        '--add-drop-table',       // backup restaurable "encima" de una BD existente
        process.env.DATABASE
    ];

    let archivoSalida;
    let proceso;
    try {
        archivoSalida = createWriteStream(rutaTemporal);
        proceso = spawn(mysqldumpBin, args, {
            env: { ...process.env, MYSQL_PWD: process.env.DB_PASS }
        });
    } catch (error) {
        console.error('No se pudo iniciar mysqldump:', error.message);
        return res.status(500).json({ msg: 'No se pudo generar el backup de la base de datos' });
    }

    let stderrAcumulado = '';
    proceso.stderr.on('data', (chunk) => {
        stderrAcumulado += chunk.toString();
    });
    proceso.stdout.pipe(archivoSalida);

    const limpiarTemporal = async () => {
        try {
            await unlink(rutaTemporal);
        } catch {
            // El archivo puede no haberse llegado a crear -no es un error a reportar.
        }
    };

    // El ejecutable ni siquiera pudo lanzarse (ENOENT típico: mysqldump no
    // está en el PATH y no se configuró MYSQLDUMP_PATH).
    proceso.on('error', async (error) => {
        console.error('No se pudo ejecutar mysqldump. Verificar que esté en el PATH o configurar MYSQLDUMP_PATH:', error.message);
        await limpiarTemporal();
        if (!res.headersSent) {
            res.status(500).json({ msg: 'No se pudo generar el backup de la base de datos' });
        }
    });

    proceso.on('close', async (codigo) => {
        if (codigo !== 0) {
            // Nunca se imprime process.env.DB_PASS ni MYSQL_PWD acá -solo lo
            // que mysqldump haya escrito en stderr (mensajes técnicos de
            // MySQL, no credenciales del .env).
            console.error(`mysqldump terminó con código ${codigo}. Detalle: ${stderrAcumulado.trim()}`);
            await limpiarTemporal();
            if (!res.headersSent) {
                return res.status(500).json({ msg: 'No se pudo generar el backup de la base de datos' });
            }
            return;
        }

        res.setHeader('Content-Type', 'application/sql');
        res.download(rutaTemporal, nombreDescarga, async (error) => {
            if (error) {
                console.error('Error al enviar el archivo de backup:', error.message);
            }
            await limpiarTemporal();
        });
    });
};