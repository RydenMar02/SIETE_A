import { Op } from 'sequelize';
import Empresa from '../models/empresa.js';
import SalaUsuario from '../models/salaUsuario.js';
import Ejercicio from '../models/ejercicio.js';
import Periodo from '../models/periodo.js';

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

export const validarEjercicioAbiertoParaEscritura = async ({ id_empresa, fecha, transaction }) => {
    if (!transaction) {
        return { valido: false, status: 500, motivo: 'SIN_TRANSACCION', msg: 'Error interno: falta contexto transaccional para validar el período contable' };
    }
    if (!fecha) {
        return { valido: false, status: 400, motivo: 'SIN_FECHA', msg: 'La fecha de la operación es obligatoria para validar el período contable' };
    }

    const id_sala = await resolverIdSala(id_empresa, transaction);
    if (!id_sala) {
        return { valido: false, status: 400, motivo: 'SIN_CONTEXTO', msg: 'No se pudo determinar la sala de la empresa' };
    }

    // 1) Ejercicio: se busca y bloquea SIN filtrar por estado en el WHERE,
    // para no perder el lock si un cierre concurrente todavía no comiteó.
    const ejercicio = await Ejercicio.findOne({
        where: {
            id_sala,
            fecha_inicio: { [Op.lte]: fecha },
            fecha_fin: { [Op.gte]: fecha }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    if (!ejercicio) {
        return { valido: false, status: 400, motivo: 'SIN_EJERCICIO', msg: 'No existe un ejercicio contable válido para esta empresa en la fecha indicada.' };
    }
    if (ejercicio.estado === 'CERRADO') {
        return { valido: false, status: 400, motivo: 'EJERCICIO_CERRADO', msg: 'El ejercicio contable se encuentra cerrado.' };
    }

    // 2) Periodo: SIEMPRE acotado a id_ejercicio (nunca un período global
    // sin ejercicio), y también bloqueado -mismo orden Ejercicio->Periodo
    // que sigue cerrarEjercicio, documentado arriba.
    const periodo = await Periodo.findOne({
        where: {
            id_ejercicio: ejercicio.id_ejercicio,
            fecha_inicio: { [Op.lte]: fecha },
            fecha_fin: { [Op.gte]: fecha }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    if (!periodo) {
        return { valido: false, status: 400, motivo: 'SIN_PERIODO', msg: 'La fecha indicada no pertenece a ningún período contable válido.' };
    }
    if (periodo.estado === 'CERRADO') {
        return { valido: false, status: 400, motivo: 'PERIODO_CERRADO', msg: 'El período contable correspondiente a la fecha seleccionada se encuentra cerrado.' };
    }

    return { valido: true, ejercicio, periodo };
};