import { Op } from 'sequelize';
import Empresa from '../models/empresa.js';
import SalaUsuario from '../models/salaUsuario.js';
import Ejercicio from '../models/ejercicio.js';

/**
 * Resuelve Empresa -> SalaUsuario -> Sala (siempre desde BD, nunca desde un
 * id_sala que mande el cliente).
 */
const resolverIdSala = async (id_empresa, transaction) => {
    const empresa = await Empresa.findByPk(id_empresa, { transaction });
    if (!empresa) return null;

    const salaUsuario = await SalaUsuario.findByPk(empresa.id_salausuario, { transaction });
    if (!salaUsuario) return null;

    return salaUsuario.id_sala;
};

/**
 * A) CONSULTA SIMPLE, no bloqueante.
 * Comprueba si la fecha dada cae dentro de un Ejercicio con
 * estado='CERRADO'. Es una lectura consistente de MySQL: NO protege
 * contra la carrera "cierre en curso, todavía sin commit" -para eso
 * existe validarEjercicioAbiertoParaEscritura más abajo. Sirve para
 * lecturas/reportes o cualquier uso que no necesite esa garantía.
 */
export const obtenerEjercicioCerradoParaFecha = async (id_empresa, fecha, transaction = null) => {
    if (!fecha) return null;

    const id_sala = await resolverIdSala(id_empresa, transaction);
    if (!id_sala) return null;

    return Ejercicio.findOne({
        where: {
            id_sala,
            estado: 'CERRADO',
            fecha_inicio: { [Op.lte]: fecha },
            fecha_fin: { [Op.gte]: fecha }
        },
        transaction
    });
};

/**
 * B) VALIDACIÓN TRANSACCIONAL/BLOQUEANTE para una operación de escritura
 * contable (crear/actualizar/procesar/eliminar Asiento; crear/actualizar/
 * imputar/anular CompraVenta).
 *
 * Exige una `transaction` real -sin ella no puede ofrecer ninguna garantía
 * y devuelve null sin bloquear nada (falla segura hacia "no bloqueado",
 * nunca hacia un falso "cerrado").
 *
 * Busca el Ejercicio que cubre la fecha SIN filtrar por estado en el
 * WHERE -si filtrara por estado='CERRADO' y el cierre todavía no hizo
 * commit, la fila seguiría "viéndose" ABIERTO y el FOR UPDATE no
 * bloquearía nada (no matchearía el WHERE). Por eso se bloquea primero
 * la fila que corresponda a esa fecha (esté abierta o cerrada), y recién
 * después se decide en código.
 *
 * Si en ese momento otra transacción (ej. el cierre) tiene el lock, esta
 * llamada queda esperando hasta que la otra termine (commit o rollback);
 * al continuar, ve el estado ya definitivo.
 *
 * Devuelve el Ejercicio si está CERRADO (para que el caller rechace la
 * operación), o null si está ABIERTO o no hay ningún ejercicio que cubra
 * esa fecha (la operación puede seguir).
 */
export const validarEjercicioAbiertoParaEscritura = async (id_empresa, fecha, transaction) => {
    if (!fecha || !transaction) return null;

    const id_sala = await resolverIdSala(id_empresa, transaction);
    if (!id_sala) return null;

    const ejercicio = await Ejercicio.findOne({
        where: {
            id_sala,
            fecha_inicio: { [Op.lte]: fecha },
            fecha_fin: { [Op.gte]: fecha }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (ejercicio && ejercicio.estado === 'CERRADO') {
        return ejercicio;
    }
    return null;
};