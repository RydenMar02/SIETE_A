import Movimiento from '../models/movimiento.js';

/**
 * Registra una fila en el historial de movimientos. Pensado para llamarse
 * desde dentro de las transacciones de crearAsiento/crearCompraVenta, así
 * que si el resto de la transacción se revierte, el movimiento también.
 *
 * @param {object} datos
 * @param {number} datos.id_usuario - quién hizo la acción
 * @param {number} datos.id_empresa - en qué empresa (así se puede filtrar por sala)
 * @param {string} datos.tipo - código corto, ej: 'CARGO_COMPRA', 'CARGO_ASIENTO'
 * @param {string} datos.descripcion - texto legible para mostrar en la bitácora
 * @param {number} [datos.referencia_id] - id del recurso creado (opcional)
 * @param {import('sequelize').Transaction} [datos.transaction]
 */
export const registrarMovimiento = async ({ id_usuario, id_empresa, tipo, descripcion, referencia_id = null, transaction }) => {
    await Movimiento.create(
        { id_usuario, id_empresa, tipo, descripcion, referencia_id },
        { transaction }
    );
};  