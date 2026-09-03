import { Op } from 'sequelize';
import Ejercicio from '../models/ejercicio.js';
import Periodo from '../models/periodo.js';
import SalaUsuario from '../models/salaUsuario.js';
import Empresa from '../models/empresa.js';
import EmpresaCuenta from '../models/empresaCuenta.js';
import Sucursal from '../models/sucursal.js';
import AsientoCabecera from '../models/asientoCabecera.js';
import AsientoDetalle from '../models/asientoDetalle.js';
import CompraVenta from '../models/compraVenta.js';
import db from '../db/conexion.js';
import { esProfesorDeSala, puedeAccederASala } from '../middlewares/pertenencia.middleware.js';
import { obtenerSaldosConRaiz, calcularEstadoResultados } from './reportesFinancieros.controller.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';

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
 * resultado (ingresos, costos, gastos) que tenga movimiento DENTRO del
 * rango del ejercicio (fecha_inicio a fecha_fin, inclusive), y traslada
 * la diferencia neta a "Resultado del Ejercicio" dentro del patrimonio.
 * Devuelve null si la empresa no tuvo ningún movimiento en cuentas de
 * resultado dentro de ese rango (nada que cerrar).
 *
 * tipo_asiento='CIERRE' (migración autorizada aplicada a
 * asiento_cabecera.tipo_asiento) identifica formalmente este asiento -ya
 * no depende de parsear numero_asiento. numero_asiento sigue siendo
 * 'CIERRE-<año>' solo como identificador legible para personas.
 */
const generarAsientoCierreDeEmpresa = async (empresa, ejercicio, transaction) => {
    const filtroFecha = { fecha_desde: ejercicio.fecha_inicio, fecha_hasta: ejercicio.fecha_fin };

    const filas = await obtenerSaldosConRaiz(empresa.id_empresa, filtroFecha, { excluirCierre: true });
    const filasResultado = filas.filter(f => !CODIGOS_BALANCE_GENERAL.includes(f.codigo_raiz));

    if (filasResultado.length === 0) {
        return null; // esta empresa no cargó ningún ingreso/costo/gasto en el rango, nada que cerrar
    }

    const detalles = [];
    for (const fila of filasResultado) {
        const netDH = (parseFloat(fila.suma_debe) || 0) - (parseFloat(fila.suma_haber) || 0);
        if (Math.abs(netDH) < 0.01) continue; // ya está en cero, no hace falta revertir

        // Defensa explícita: aunque por construcción ninguna cuenta
        // subtotal (sin hijos) puede llegar a tener movimiento real, se
        // verifica igual que la cuenta de origen sea asentable y activa
        // antes de usarla en la reversión.
        const cuentaOrigen = await EmpresaCuenta.findByPk(fila.id_empresacuenta, { transaction });
        if (!cuentaOrigen || cuentaOrigen.asentable !== 'SI' || cuentaOrigen.estado !== 1) {
            throw new Error(`La cuenta "${fila.nombre_cuenta}" (${fila.codigo_cuenta}) tiene movimiento pero no es una cuenta asentable/activa válida para el cierre`);
        }

        detalles.push({
            id_empresacuenta: fila.id_empresacuenta,
            debe: netDH < 0 ? -netDH : 0,
            haber: netDH > 0 ? netDH : 0
        });
    }

    if (detalles.length === 0) {
        return null;
    }

    const { resultado_neto } = await calcularEstadoResultados(empresa.id_empresa, filtroFecha, { excluirCierre: true });

    const cuentaResultado = await EmpresaCuenta.findOne({
        where: { id_empresa: empresa.id_empresa, codigo: CODIGO_RESULTADO_DEL_EJERCICIO, estado: 1 },
        transaction
    });
    if (!cuentaResultado) {
        throw new Error(`No se encontró la cuenta "Resultado del Ejercicio" (código ${CODIGO_RESULTADO_DEL_EJERCICIO}) en la empresa "${empresa.nombre}"`);
    }
    if (cuentaResultado.asentable !== 'SI') {
        throw new Error(`La cuenta "Resultado del Ejercicio" (${CODIGO_RESULTADO_DEL_EJERCICIO}) de la empresa "${empresa.nombre}" no es asentable`);
    }
    if (cuentaResultado.naturaleza !== 'ACREEDORA') {
        throw new Error(`La cuenta "Resultado del Ejercicio" (${CODIGO_RESULTADO_DEL_EJERCICIO}) de la empresa "${empresa.nombre}" tiene naturaleza "${cuentaResultado.naturaleza}"; se esperaba ACREEDORA`);
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
        tipo_asiento: 'CIERRE',
        numero_asiento: numeroAsiento,
        fecha: ejercicio.fecha_fin,
        documento: `Cierre ${anio}`,
        total_debe: totalDebe,
        total_haber: totalHaber,
        diferencia: totalDebe - totalHaber,
        concepto: `Cierre del ejercicio ${ejercicio.nombre}`,
        // El cierre es una operación contable definitiva: nace directamente
        // 'procesado', no 'pendiente'. Así las reglas normales de Asientos
        // (que ya bloquean PUT/DELETE/volver a procesar sobre 'procesado')
        // lo protegen automáticamente sin necesitar un caso especial.
        estado: 'procesado'
    }, { transaction });

    await AsientoDetalle.bulkCreate(
        detalles.map(d => ({ ...d, id_asiento: cabecera.id_asiento })),
        { transaction }
    );

    return cabecera;
};

/**
 * Cierra el ejercicio: genera el asiento de cierre para cada empresa
 * activa de la sala (reversando ingresos/costos/gastos DENTRO del rango
 * del ejercicio y trasladando el resultado neto a patrimonio), y recién
 * si todo salió bien, marca el ejercicio y sus periodos como CERRADO.
 *
 * Todo-o-nada por diseño: el Ejercicio pertenece a la Sala y representa
 * una actividad académica común -si una sola empresa falla, se revierte
 * el cierre completo de la sala, no se cierran empresas parcialmente.
 */
export const cerrarEjercicio = async (req, res) => {
    const { id } = req.params;

    try {
        const ejercicioPrevio = await Ejercicio.findByPk(id);
        if (!ejercicioPrevio) {
            return res.status(404).json({ msg: 'Ejercicio no encontrado' });
        }

        if (!(await esProfesorDeSala(req, ejercicioPrevio.id_sala))) {
            return res.status(403).json({ msg: 'Solo el profesor de la sala puede cerrar el ejercicio' });
        }

        const resultado = await db.transaction(async (t) => {
            // Re-leer el Ejercicio CON bloqueo de fila (SELECT ... FOR UPDATE)
            // dentro de la transacción: si dos cierres llegan casi
            // simultáneos, el segundo queda esperando acá hasta que el
            // primero termine, y al continuar ve el estado ya actualizado
            // -evita la ventana de carrera del chequeo hecho antes de abrir
            // la transacción.
            const ejercicio = await Ejercicio.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!ejercicio) {
                const err = new Error('Ejercicio no encontrado');
                err.status = 404;
                throw err;
            }
            if (ejercicio.estado === 'CERRADO') {
                const err = new Error('Este ejercicio ya está cerrado');
                err.status = 400;
                throw err;
            }

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

            // Validación previa crítica: 0 asientos pendientes y 0
            // CompraVenta borrador (imputada='NO') dentro del rango del
            // ejercicio, para TODAS las empresas, antes de generar nada.
            // No se procesan/imputan automáticamente -la decisión de qué
            // hacer con cada pendiente es del profesor.
            const pendientesPorEmpresa = [];
            for (const empresa of empresas) {
                const cantidadAsientosPendientes = await AsientoCabecera.count({
                    where: {
                        id_empresa: empresa.id_empresa,
                        estado: 'pendiente',
                        fecha: { [Op.gte]: ejercicio.fecha_inicio, [Op.lte]: ejercicio.fecha_fin }
                    },
                    transaction: t
                });

                const cantidadBorradores = await CompraVenta.count({
                    where: {
                        estado: 1,
                        imputada: 'NO',
                        fecha: { [Op.gte]: ejercicio.fecha_inicio, [Op.lte]: ejercicio.fecha_fin }
                    },
                    include: [{ model: Sucursal, required: true, where: { id_empresa: empresa.id_empresa } }],
                    transaction: t
                });

                if (cantidadAsientosPendientes > 0 || cantidadBorradores > 0) {
                    pendientesPorEmpresa.push({
                        empresa: empresa.nombre,
                        asientosPendientes: cantidadAsientosPendientes,
                        comprasVentasBorrador: cantidadBorradores
                    });
                }
            }

            if (pendientesPorEmpresa.length > 0) {
                const err = new Error('Existen operaciones pendientes dentro del rango del ejercicio que deben resolverse antes de cerrar');
                err.status = 400;
                err.detalle = pendientesPorEmpresa;
                throw err;
            }

            const asientosGenerados = [];
            for (const empresa of empresas) {
                const cabecera = await generarAsientoCierreDeEmpresa(empresa, ejercicio, t);
                if (cabecera) {
                    asientosGenerados.push({ empresa: empresa.nombre, id_asiento: cabecera.id_asiento, numero_asiento: cabecera.numero_asiento });

                    await registrarMovimiento({
                        id_usuario: req.usuario.id_usuario,
                        id_empresa: empresa.id_empresa,
                        tipo: 'CERRO_EJERCICIO',
                        descripcion: `Cerró el ejercicio "${ejercicio.nombre}" (${ejercicio.fecha_inicio} a ${ejercicio.fecha_fin}), asiento ${cabecera.numero_asiento}`,
                        referencia_id: cabecera.id_asiento,
                        transaction: t
                    });
                }
            }

            // El sistema siempre genera 12 al crear el ejercicio; si por
            // algún motivo histórico hubiera una cantidad distinta, no se
            // aborta automáticamente (no es un caso contemplado como error
            // crítico todavía) -se deja constancia en el log del servidor
            // y se cierran los que efectivamente existan.
            const periodos = await Periodo.findAll({ where: { id_ejercicio: ejercicio.id_ejercicio }, transaction: t });
            if (periodos.length !== 12) {
                console.warn(`[cerrarEjercicio] El ejercicio ${ejercicio.id_ejercicio} tiene ${periodos.length} periodos en vez de 12 -se cierran igual los que existen.`);
            }

            await ejercicio.update({ estado: 'CERRADO' }, { transaction: t });
            await Periodo.update(
                { estado: 'CERRADO' },
                { where: { id_ejercicio: ejercicio.id_ejercicio }, transaction: t }
            );

            return { totalEmpresas: empresas.length, asientosGenerados, totalPeriodos: periodos.length };
        });

        res.json({
            msg: `Ejercicio cerrado. Se generaron ${resultado.asientosGenerados.length} asientos de cierre de ${resultado.totalEmpresas} empresas.`,
            asientosGenerados: resultado.asientosGenerados,
            totalPeriodos: resultado.totalPeriodos
        });
    } catch (error) {
        console.error(error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ msg: 'Ya existe un asiento de cierre para alguna de estas empresas en este año.' });
        }
        if (error.status === 400 && error.detalle) {
            return res.status(400).json({ msg: error.message, detalle: error.detalle });
        }
        return res.status(error.status || 500).json({ msg: error.message || 'Error al cerrar ejercicio' });
    }
};