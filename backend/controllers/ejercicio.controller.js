import Ejercicio from '../models/ejercicio.js';
import Periodo from '../models/periodo.js';
import SalaUsuario from '../models/salaUsuario.js';
import Empresa from '../models/empresa.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import Sucursal from '../models/sucursal.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import db from '../db/conexion.js';
import { esProfesorDeSala, puedeAccederASala } from '../middlewares/pertenencia.middleware.js';
import { obtenerSaldosConRaiz, calcularEstadoResultados } from './reportesFinancieros.controller.js';

const CODIGO_RESULTADO_DEL_EJERCICIO = '3.3.2';
const CODIGOS_BALANCE_GENERAL = ['1', '2', '3'];

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Devuelve el último día del mes (1-12) para un año dado, en formato YYYY-MM-DD */
const ultimoDiaDeMes = (anio, mes) => {
    const fecha = new Date(anio, mes, 0); // día 0 del mes siguiente = último día del mes actual
    return fecha.toISOString().slice(0, 10);
};

export const getEjerciciosPorSala = async (req, res) => {
    const { id_sala } = req.query;

    if (!id_sala) {
        return res.status(400).json({ msg: 'id_sala es obligatorio' });
    }

    try {
        if (!(await puedeAccederASala(req, parseInt(id_sala)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver los ejercicios de esta sala' });
        }

        const ejercicios = await Ejercicio.findAll({
            where: { id_sala: parseInt(id_sala) },
            order: [['fecha_inicio', 'DESC']]
        });

        res.json({ total: ejercicios.length, ejercicios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener ejercicios' });
    }
};

export const getEjercicioById = async (req, res) => {
    const { id } = req.params;

    try {
        const ejercicio = await Ejercicio.findByPk(id, {
            include: [{ model: Periodo }]
        });
        if (!ejercicio) {
            return res.status(404).json({ msg: 'Ejercicio no encontrado' });
        }

        if (!(await puedeAccederASala(req, ejercicio.id_sala))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver este ejercicio' });
        }

        res.json(ejercicio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener ejercicio' });
    }
};

/**
 * Crea un ejercicio (solo el profesor de la sala) y genera automáticamente
 * sus 12 periodos mensuales dentro del rango de fechas indicado.
 * Por ahora se asume ejercicio anual calendario (enero-diciembre) para
 * simplificar; si más adelante hace falta un ejercicio con otro rango,
 * ajustar la generación de periodos.
 */
export const crearEjercicio = async (req, res) => {
    const { id_sala, nombre, anio } = req.body;

    if (!id_sala || !nombre || !anio) {
        return res.status(400).json({ msg: 'id_sala, nombre y anio son obligatorios' });
    }

    try {
        if (!(await esProfesorDeSala(req, id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede crear un ejercicio' });
        }

        const resultado = await db.transaction(async (t) => {
            const ejercicio = await Ejercicio.create({
                id_sala,
                nombre,
                fecha_inicio: `${anio}-01-01`,
                fecha_fin: `${anio}-12-31`,
                estado: 'ABIERTO'
            }, { transaction: t });

            const periodos = MESES.map((nombreMes, index) => {
                const mes = index + 1;
                return {
                    id_ejercicio: ejercicio.id_ejercicio,
                    mes,
                    nombre: nombreMes,
                    fecha_inicio: `${anio}-${String(mes).padStart(2, '0')}-01`,
                    fecha_fin: ultimoDiaDeMes(anio, mes),
                    estado: 'ABIERTO'
                };
            });

            await Periodo.bulkCreate(periodos, { transaction: t });

            return ejercicio;
        });

        const ejercicioCompleto = await Ejercicio.findByPk(resultado.id_ejercicio, {
            include: [{ model: Periodo }]
        });

        res.status(201).json({ msg: 'Ejercicio creado con sus 12 periodos', ejercicio: ejercicioCompleto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al crear ejercicio' });
    }
};

/**
 * Genera el asiento de cierre de UNA empresa: reversa cada cuenta de
 * resultado (ingresos, costos, gastos) que tenga movimiento, y traslada
 * la diferencia neta a "Resultado del Ejercicio" dentro del patrimonio.
 * Devuelve null si la empresa no tuvo ningún movimiento en cuentas de
 * resultado (nada que cerrar).
 */
const generarAsientoCierreDeEmpresa = async (empresa, ejercicio, transaction) => {
    const filas = await obtenerSaldosConRaiz(empresa.id_empresa);
    const filasResultado = filas.filter(f => !CODIGOS_BALANCE_GENERAL.includes(f.codigo_raiz));

    if (filasResultado.length === 0) {
        return null; // esta empresa no cargó ningún ingreso/costo/gasto, nada que cerrar
    }

    const detalles = [];
    for (const fila of filasResultado) {
        const netDH = (parseFloat(fila.suma_debe) || 0) - (parseFloat(fila.suma_haber) || 0);
        if (Math.abs(netDH) < 0.01) continue; // ya está en cero, no hace falta revertir
        detalles.push({
            id_empresacuenta: fila.id_empresacuenta,
            debe: netDH < 0 ? -netDH : 0,
            haber: netDH > 0 ? netDH : 0
        });
    }

    if (detalles.length === 0) {
        return null;
    }

    const { resultado_neto } = await calcularEstadoResultados(empresa.id_empresa);

    const cuentaResultado = await EmpresaCuenta.findOne({
        where: { id_empresa: empresa.id_empresa, codigo: CODIGO_RESULTADO_DEL_EJERCICIO, estado: 1 },
        transaction
    });
    if (!cuentaResultado) {
        throw new Error(`No se encontró la cuenta "Resultado del Ejercicio" (código ${CODIGO_RESULTADO_DEL_EJERCICIO}) en la empresa "${empresa.nombre}"`);
    }

    if (Math.abs(resultado_neto) >= 0.01) {
        detalles.push({
            id_empresacuenta: cuentaResultado.id_empresacuenta,
            debe: resultado_neto < 0 ? -resultado_neto : 0,
            haber: resultado_neto > 0 ? resultado_neto : 0
        });
    }

    const totalDebe = detalles.reduce((acc, d) => acc + d.debe, 0);
    const totalHaber = detalles.reduce((acc, d) => acc + d.haber, 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
        throw new Error(`El asiento de cierre de "${empresa.nombre}" no quedó balanceado, revisar el plan de cuentas`);
    }

    const sucursal = await Sucursal.findOne({
        where: { id_empresa: empresa.id_empresa, estado: 1 },
        transaction
    });
    if (!sucursal) {
        throw new Error(`La empresa "${empresa.nombre}" no tiene ninguna sucursal activa, no se puede generar el cierre`);
    }

    const anio = new Date(ejercicio.fecha_fin).getFullYear();
    const numeroAsiento = `CIERRE-${anio}`;

    const yaExiste = await AsientoCabecera.findOne({
        where: { id_empresa: empresa.id_empresa, numero_asiento: numeroAsiento },
        transaction
    });
    if (yaExiste) {
        throw new Error(`La empresa "${empresa.nombre}" ya tiene un asiento de cierre para ${anio}`);
    }

    const cabecera = await AsientoCabecera.create({
        id_empresa: empresa.id_empresa,
        id_sucursal: sucursal.id_sucursal,
        tipo_asiento: 'AJUSTE',
        numero_asiento: numeroAsiento,
        fecha: ejercicio.fecha_fin,
        documento: `Cierre ${anio}`,
        total_debe: totalDebe,
        total_haber: totalHaber,
        diferencia: totalDebe - totalHaber,
        concepto: `Cierre del ejercicio ${ejercicio.nombre}`,
        estado: 'pendiente'
    }, { transaction });

    await AsientoDetalle.bulkCreate(
        detalles.map(d => ({ ...d, id_asiento: cabecera.id_asiento })),
        { transaction }
    );

    return cabecera;
};

/**
 * Cierra el ejercicio: genera el asiento de cierre para cada empresa
 * activa de la sala (reversando ingresos/costos/gastos y trasladando el
 * resultado neto a patrimonio), y recién si todo salió bien, marca el
 * ejercicio y sus 12 periodos como CERRADO.
 */
export const cerrarEjercicio = async (req, res) => {
    const { id } = req.params;

    try {
        const ejercicio = await Ejercicio.findByPk(id);
        if (!ejercicio) {
            return res.status(404).json({ msg: 'Ejercicio no encontrado' });
        }

        if (!(await esProfesorDeSala(req, ejercicio.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede cerrar el ejercicio' });
        }

        if (ejercicio.estado === 'CERRADO') {
            return res.status(400).json({ msg: 'Este ejercicio ya está cerrado' });
        }

        const resultado = await db.transaction(async (t) => {
            const alumnosSala = await SalaUsuario.findAll({
                where: { id_sala: ejercicio.id_sala, tipo: 'ALUMNO', estado: 1 },
                attributes: ['id_salausuario'],
                transaction: t
            });
            const idsSalaUsuario = alumnosSala.map(su => su.id_salausuario);

            const empresas = idsSalaUsuario.length === 0 ? [] : await Empresa.findAll({
                where: { id_salausuario: idsSalaUsuario, estado: 1 },
                transaction: t
            });

            const asientosGenerados = [];
            for (const empresa of empresas) {
                const cabecera = await generarAsientoCierreDeEmpresa(empresa, ejercicio, t);
                if (cabecera) asientosGenerados.push({ empresa: empresa.nombre, id_asiento: cabecera.id_asiento });
            }

            await ejercicio.update({ estado: 'CERRADO' }, { transaction: t });
            await Periodo.update(
                { estado: 'CERRADO' },
                { where: { id_ejercicio: ejercicio.id_ejercicio }, transaction: t }
            );

            return { totalEmpresas: empresas.length, asientosGenerados };
        });

        res.json({
            msg: `Ejercicio cerrado. Se generaron ${resultado.asientosGenerados.length} asientos de cierre de ${resultado.totalEmpresas} empresas.`,
            asientosGenerados: resultado.asientosGenerados
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: error.message || 'Error al cerrar ejercicio' });
    }
};