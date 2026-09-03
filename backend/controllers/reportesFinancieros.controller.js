import db from '../db/conexion.js';
import Empresa from '../models/empresa.js';
import Ejercicio from '../models/ejercicio.js';
import SalaUsuario from '../models/salaUsuario.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { validarFiltroFechas, construirFiltroFechaSQL } from '../helpers/reportesHelper.js';

// Códigos raíz (nivel 1) del plan de cuentas que corresponden al Balance
// General (Activo, Pasivo, Patrimonio). Todo lo demás (4 en adelante:
// Ingresos, Costos, Gastos, etc.) es Estado de Resultados.
const CODIGOS_BALANCE_GENERAL = ['1', '2', '3'];

/**
 * Trae, para cada cuenta con movimiento en la empresa, su saldo y a qué
 * cuenta raíz (nivel 1) pertenece -usando una consulta recursiva que sube
 * por id_padre hasta el nivel 1, siempre scopeada a la misma empresa
 * (id_padre en empresa_cuenta apunta a id_cuenta, que se repite una vez
 * por empresa, así que hay que filtrar por id_empresa en cada salto para
 * no cruzar el árbol de una empresa con el de otra).
 * Acepta opcionalmente { fecha_desde, fecha_hasta } para acotar los
 * asientos considerados; sin filtro, se conserva el comportamiento
 * histórico (toda la actividad de la empresa).
 */
const SQL_SALDOS_POR_RAIZ = `
    WITH RECURSIVE ancestro AS (
        SELECT id_empresacuenta AS id_origen, id_cuenta, id_padre, codigo, nombre, naturaleza, nivel
        FROM empresa_cuenta
        WHERE id_empresa = :id_empresa

        UNION ALL

        SELECT a.id_origen, ec.id_cuenta, ec.id_padre, ec.codigo, ec.nombre, ec.naturaleza, ec.nivel
        FROM ancestro a
        JOIN empresa_cuenta ec ON ec.id_cuenta = a.id_padre AND ec.id_empresa = :id_empresa
    )
    SELECT
        ec.id_empresacuenta,
        ec.codigo AS codigo_cuenta,
        ec.nombre AS nombre_cuenta,
        raiz.codigo AS codigo_raiz,
        raiz.nombre AS nombre_raiz,
        raiz.naturaleza AS naturaleza_raiz,
        SUM(ad.debe) AS suma_debe,
        SUM(ad.haber) AS suma_haber
    FROM asiento_detalle ad
    JOIN empresa_cuenta ec ON ad.id_empresacuenta = ec.id_empresacuenta
    JOIN asiento_cabecera ac ON ad.id_asiento = ac.id_asiento
    JOIN ancestro raiz ON raiz.id_origen = ec.id_empresacuenta AND raiz.nivel = 1
    WHERE ac.id_empresa = :id_empresa
      AND ac.estado != 'anulado'
      /*FILTRO_FECHA*/
    GROUP BY ec.id_empresacuenta, ec.codigo, ec.nombre, raiz.codigo, raiz.nombre, raiz.naturaleza
    ORDER BY raiz.codigo, ec.codigo
`;

/** Agrupa las filas planas por cuenta raíz y calcula el saldo de cada grupo */
const agruparPorRaiz = (filas) => {
    const grupos = new Map();

    for (const fila of filas) {
        const key = fila.codigo_raiz;
        if (!grupos.has(key)) {
            grupos.set(key, {
                codigo_raiz: fila.codigo_raiz,
                nombre_raiz: fila.nombre_raiz,
                naturaleza_raiz: fila.naturaleza_raiz,
                cuentas: [],
                total: 0
            });
        }
        const grupo = grupos.get(key);

        const debe = parseFloat(fila.suma_debe) || 0;
        const haber = parseFloat(fila.suma_haber) || 0;
        const saldoCuenta = fila.naturaleza_raiz === 'ACREEDORA' ? (haber - debe) : (debe - haber);

        grupo.cuentas.push({
            codigo: fila.codigo_cuenta,
            nombre: fila.nombre_cuenta,
            saldo: saldoCuenta
        });
        grupo.total += saldoCuenta;
    }

    return Array.from(grupos.values()).sort((a, b) => parseInt(a.codigo_raiz) - parseInt(b.codigo_raiz));
};

/**
 * Trae las filas planas (una por cuenta con movimiento), ya con su raíz
 * resuelta. filtroFecha es opcional -{fecha_desde, fecha_hasta}-; sin él,
 * se conserva el comportamiento histórico (se llama así, sin segundo
 * argumento, desde ejercicio.controller.js para el cierre de ejercicio).
 */
export const obtenerSaldosConRaiz = async (id_empresa, filtroFecha = {}) => {
    const { fragmento, replacements } = construirFiltroFechaSQL(filtroFecha.fecha_desde, filtroFecha.fecha_hasta);
    const sql = SQL_SALDOS_POR_RAIZ.replace('/*FILTRO_FECHA*/', fragmento);
    const [filas] = await db.query(sql, { replacements: { id_empresa, ...replacements } });
    return filas;
};

/**
 * Calcula el Estado de Resultados de una empresa: agrupa por cuenta raíz
 * (Ingresos, Costos, Gastos, etc.) y devuelve el resultado neto del
 * ejercicio (positivo = ganancia, negativo = pérdida).
 * Se exporta como función reusable porque el Balance General también
 * necesita este número para poder cerrar (activo = pasivo + patrimonio).
 * filtroFecha es opcional, mismo comportamiento que obtenerSaldosConRaiz.
 */
export const calcularEstadoResultados = async (id_empresa, filtroFecha = {}) => {
    const filas = await obtenerSaldosConRaiz(id_empresa, filtroFecha);
    const gruposTodos = agruparPorRaiz(filas);
    const grupos = gruposTodos.filter(g => !CODIGOS_BALANCE_GENERAL.includes(g.codigo_raiz));

    // Los grupos de naturaleza ACREEDORA (ingresos) suman; los de
    // naturaleza DEUDORA (costos, gastos) restan.
    const resultado_neto = grupos.reduce((acc, g) => {
        return acc + (g.naturaleza_raiz === 'ACREEDORA' ? g.total : -g.total);
    }, 0);

    return { grupos, resultado_neto };
};

/**
 * Resuelve un id_ejercicio a su rango de fechas (fecha_inicio/fecha_fin,
 * ya existentes en el modelo Ejercicio -no hace falta derivarlas de
 * Periodo), validando que el ejercicio exista y pertenezca a la misma
 * sala que la empresa consultada. Devuelve { error } o { fecha_desde,
 * fecha_hasta }.
 */
const resolverRangoPorEjercicio = async (id_ejercicio, id_empresa) => {
    const ejercicio = await Ejercicio.findByPk(id_ejercicio);
    if (!ejercicio) {
        return { error: { status: 404, msg: 'El ejercicio indicado no existe' } };
    }

    const empresa = await Empresa.findByPk(id_empresa, { include: [SalaUsuario] });
    if (!empresa || !empresa.SalaUsuario) {
        return { error: { status: 400, msg: 'No se pudo determinar la sala de la empresa' } };
    }

    if (ejercicio.id_sala !== empresa.SalaUsuario.id_sala) {
        return { error: { status: 403, msg: 'El ejercicio indicado no pertenece a la sala de esta empresa' } };
    }

    return { fecha_desde: ejercicio.fecha_inicio, fecha_hasta: ejercicio.fecha_fin, ejercicio };
};

export const getEstadoResultados = async (req, res) => {
    const { id_empresa, id_ejercicio, fecha_desde, fecha_hasta } = req.query;

    if (!id_empresa) {
        return res.status(400).json({ msg: 'id_empresa es obligatorio' });
    }

    try {
        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el estado de resultados de esta empresa' });
        }

        const empresa = await Empresa.findByPk(idEmpresaNum, { attributes: ['nombre'] });
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }

        // Precedencia de filtros: id_ejercicio define el rango base. Si
        // además vienen fechas explícitas, se rechaza -no se mezclan
        // criterios ambiguos.
        let filtroFecha;
        if (id_ejercicio && (fecha_desde || fecha_hasta)) {
            return res.status(400).json({
                msg: 'No se puede combinar id_ejercicio con fecha_desde/fecha_hasta. Usá uno u otro.'
            });
        }

        if (id_ejercicio) {
            const { error, fecha_desde: fd, fecha_hasta: fh } = await resolverRangoPorEjercicio(id_ejercicio, idEmpresaNum);
            if (error) {
                return res.status(error.status).json({ msg: error.msg });
            }
            filtroFecha = { fecha_desde: fd, fecha_hasta: fh };
        } else {
            const { error, fecha_desde: fd, fecha_hasta: fh } = validarFiltroFechas(req.query);
            if (error) {
                return res.status(error.status).json({ msg: error.msg });
            }
            filtroFecha = { fecha_desde: fd, fecha_hasta: fh };
        }

        const { grupos, resultado_neto } = await calcularEstadoResultados(idEmpresaNum, filtroFecha);

        res.json({
            empresa: empresa.nombre,
            filtro: filtroFecha,
            grupos,
            resultado_neto,
            resultado_tipo: resultado_neto >= 0 ? 'GANANCIA' : 'PÉRDIDA'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al calcular el estado de resultados' });
    }
};

export const getBalanceGeneral = async (req, res) => {
    const { id_empresa } = req.query;

    if (!id_empresa) {
        return res.status(400).json({ msg: 'id_empresa es obligatorio' });
    }

    try {
        const idEmpresaNum = parseInt(id_empresa);
        if (!(await puedeAccederAEmpresa(req, idEmpresaNum))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver el balance general de esta empresa' });
        }

        const empresa = await Empresa.findByPk(idEmpresaNum, { attributes: ['nombre'] });
        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }

        // Para Balance General normalmente se usa fecha_hasta como fecha de
        // corte; si además viene fecha_desde se respeta como rango por
        // consistencia técnica, pero contablemente lo esperable es solo
        // fecha_hasta (el balance es acumulativo desde el origen).
        const { error, fecha_desde, fecha_hasta } = validarFiltroFechas(req.query);
        if (error) {
            return res.status(error.status).json({ msg: error.msg });
        }
        const filtroFecha = { fecha_desde, fecha_hasta };

        const filas = await obtenerSaldosConRaiz(idEmpresaNum, filtroFecha);
        const gruposTodos = agruparPorRaiz(filas);
        const grupos = gruposTodos.filter(g => CODIGOS_BALANCE_GENERAL.includes(g.codigo_raiz));

        const activo = grupos.find(g => g.codigo_raiz === '1')?.total || 0;
        const pasivo = grupos.find(g => g.codigo_raiz === '2')?.total || 0;
        const patrimonioBase = grupos.find(g => g.codigo_raiz === '3')?.total || 0;

        // El resultado del ejercicio (todavía no cerrado) se suma al
        // patrimonio para que el balance efectivamente cierre: Activo =
        // Pasivo + Patrimonio + Resultado del ejercicio. Usa el MISMO
        // filtro de fecha que el resto del balance, para que ambos números
        // representen el mismo corte temporal.
        const { resultado_neto } = await calcularEstadoResultados(idEmpresaNum, filtroFecha);
        const patrimonioTotal = patrimonioBase + resultado_neto;

        res.json({
            empresa: empresa.nombre,
            filtro: filtroFecha,
            grupos,
            resultado_ejercicio_no_cerrado: resultado_neto,
            totales: {
                activo,
                pasivo,
                patrimonio: patrimonioTotal,
                pasivo_mas_patrimonio: pasivo + patrimonioTotal,
                diferencia: activo - (pasivo + patrimonioTotal)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al calcular el balance general' });
    }
};