import EmpresaCuenta from '../models/empresaCuenta.js';
import Empresa from '../models/empresa.js';
import db from '../db/conexion.js';
import { puedeAccederAEmpresa } from '../middlewares/pertenencia.middleware.js';
import { registrarMovimiento } from '../helpers/registrarMovimiento.js';

export const getEmpresaCuentas = async (req, res) => {
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las cuentas de esta empresa' });
        }

        const cuentas = await EmpresaCuenta.findAll({
            where: { id_empresa: parseInt(id_empresa), estado: 1 },
            order: [['codigo', 'ASC']]
        });

        if (cuentas.length === 0) {
            return res.status(404).json({ msg: 'No hay cuentas registradas para esta empresa' });
        }

        res.json({ total: cuentas.length, cuentas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuentas' });
    }
};

export const getEmpresaCuentaById = async (req, res) => {
    const { id } = req.params;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }
        res.json(cuenta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuenta' });
    }
};

export const getCuentaByCode = async (req, res) => {
    const { codigo } = req.params;
    const { id_empresa } = req.query;

    try {
        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las cuentas de esta empresa' });
        }

        const cuenta = await EmpresaCuenta.findOne({
            where: {
                id_empresa: parseInt(id_empresa),
                codigo,
                estado: 1
            },
            attributes: ['id_empresacuenta', 'id_cuenta', 'nombre', 'codigo', 'nivel', 'id_padre', 'id_empresa']
        });

        if (!cuenta) {
            return res.status(404).json({ msg: `No se encontró cuenta con código ${codigo} para la empresa ${id_empresa}` });
        }

        res.json(cuenta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener la cuenta contable' });
    }
};
// Filtrar por nivel y padre — igual que el proyecto anterior
export const getCuentasPorNivelYPadre = async (req, res) => {
    try {
        let { nivel, id_padre, id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las cuentas de esta empresa' });
        }

        const where = {
            estado: 1,
            id_empresa: parseInt(id_empresa)
        };

        if (nivel) {
            where.nivel = parseInt(nivel);
        }

        if (id_padre !== undefined && id_padre !== null && id_padre !== '' && id_padre !== 'null') {
            where.id_padre = parseInt(id_padre);
        } else {
            where.id_padre = null;
        }

        const cuentas = await EmpresaCuenta.findAll({
            where,
            attributes: ['id_empresacuenta', 'id_cuenta', 'nombre', 'codigo', 'nivel', 'id_padre', 'id_empresa'],
            order: [['codigo', 'ASC']]
        });

        res.json({ cuentas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener cuentas filtradas' });
    }
};

// Estructura jerárquica de cuentas — igual resultado visual que antes,
// pero armado en memoria a partir de una sola consulta ya scopeada por
// empresa, en vez de depender del include anidado de `cuentasHijas`
// (ver nota en models/empresaCuenta.js sobre por qué esa asociación no
// es segura de usar directamente sin ese scope manual).
export const getEstructuraCuentas = async (req, res) => {
    try {
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ msg: 'El id_empresa es obligatorio' });
        }

        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para ver las cuentas de esta empresa' });
        }

        const empresaId = parseInt(id_empresa);

        const todasLasCuentas = await EmpresaCuenta.findAll({
            where: { id_empresa: empresaId, estado: 1 },
            order: [['codigo', 'ASC']]
        });

        const porIdCuenta = new Map();
        for (const cuenta of todasLasCuentas) {
            porIdCuenta.set(cuenta.id_cuenta, { ...cuenta.toJSON(), cuentasHijas: [] });
        }

        const raices = [];
        for (const cuenta of porIdCuenta.values()) {
            if (cuenta.id_padre !== null && porIdCuenta.has(cuenta.id_padre)) {
                porIdCuenta.get(cuenta.id_padre).cuentasHijas.push(cuenta);
            } else {
                // Sin padre, o padre inactivo/inexistente en esta empresa:
                // se muestra como raíz en vez de desaparecer en silencio.
                raices.push(cuenta);
            }
        }

        res.json(raices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener estructura de cuentas' });
    }
};

// Crear cuenta nueva dentro de la empresa
export const crearEmpresaCuenta = async (req, res) => {
    const { codigo, id_padre, id_empresa, nombre, nombre_alternativo, naturaleza, moneda, asentable } = req.body;
    let transaction;

    try {
        if (!(await puedeAccederAEmpresa(req, parseInt(id_empresa)))) {
            return res.status(403).json({ msg: 'No tenés permiso para crear cuentas en esta empresa' });
        }

        transaction = await db.transaction();

        // Bloqueamos la fila de Empresa como mutex por empresa: si dos
        // altas de cuenta manual llegan casi simultáneas para la MISMA
        // empresa, la segunda queda esperando acá hasta que la primera
        // termine su transacción -así nunca calculan el mismo id_cuenta
        // negativo a partir del mismo MIN(). No depende de gap-locks sobre
        // empresa_cuenta (más frágil si esa tabla no tiene índice propio
        // sobre id_empresa): bloquea directamente la fila única de
        // Empresa, mismo patrón ya usado y probado para el cierre de
        // ejercicio. UNIQUE(id_empresa, id_cuenta) queda como red de
        // seguridad final por si algo igual se escapara.
        const empresaBloqueada = await Empresa.findByPk(id_empresa, { transaction, lock: transaction.LOCK.UPDATE });
        if (!empresaBloqueada) {
            await transaction.rollback();
            return res.status(404).json({ msg: 'Empresa no encontrada' });
        }

        let nivel = 1;

        // El frontend real (CuentaModal.vue: los <select> en cascada usan
        // :value="cuenta.id_cuenta") envía en `id_padre` el id_cuenta
        // lógico del padre elegido -no su id_empresacuenta-, así que se
        // valida existencia + pertenencia + activa buscando directamente
        // por (id_empresa, id_cuenta), y se guarda tal cual, sin convertir
        // nada.
        if (id_padre) {
            const cuentaPadre = await EmpresaCuenta.findOne({
                where: { id_empresa, id_cuenta: id_padre, estado: 1 },
                transaction
            });
            if (!cuentaPadre) {
                await transaction.rollback();
                return res.status(400).json({ msg: 'La cuenta padre no existe, no pertenece a esta empresa o está inactiva' });
            }
            nivel = cuentaPadre.nivel + 1;
        }

        // empresa_cuenta.id_cuenta es NOT NULL y ahora tiene
        // UNIQUE(id_empresa, id_cuenta). Una cuenta creada manualmente no
        // corresponde a ninguna fila del plan maestro `cuenta` (nunca se
        // toca esa tabla), así que no tiene un id_cuenta real -se le
        // asigna un valor negativo único dentro de esta empresa (los
        // id_cuenta del plan maestro siempre son positivos, nunca puede
        // haber colisión con ellos).
        const minIdCuentaActual = await EmpresaCuenta.min('id_cuenta', { where: { id_empresa }, transaction });
        const nuevoIdCuenta = Math.min(minIdCuentaActual ?? 0, 0) - 1;

        let cuenta;
        try {
            cuenta = await EmpresaCuenta.create({
                codigo,
                nombre,
                nombre_alternativo: nombre_alternativo || '',
                id_padre: id_padre || null,
                naturaleza,
                moneda: moneda || 'LOCAL',
                asentable,
                nivel,
                id_empresa,
                id_cuenta: nuevoIdCuenta,
                pordefecto: 0,
                estado: 1
            }, { transaction });
        } catch (errorCreate) {
            // Red de seguridad final: si por cualquier motivo se generó un
            // id_cuenta duplicado para esta empresa, se rechaza con un
            // mensaje claro en vez de un 500 genérico.
            if (errorCreate.name === 'SequelizeUniqueConstraintError') {
                await transaction.rollback();
                return res.status(409).json({ msg: 'Conflicto generando el identificador interno de la cuenta, reintentá la operación' });
            }
            throw errorCreate;
        }

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa,
            tipo: 'CREO_CUENTA',
            descripcion: `Creó la cuenta "${cuenta.nombre}" (${cuenta.codigo})`,
            referencia_id: cuenta.id_empresacuenta,
            transaction
        });

        await transaction.commit();

        res.status(201).json({ msg: 'Cuenta creada correctamente', cuenta });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error(error);
        res.status(500).json({ msg: 'Error al crear cuenta' });
    }
};

export const actualizarEmpresaCuenta = async (req, res) => {
    const { id } = req.params;
    // estado NUNCA se acepta acá: cambiar el estado de una cuenta tiene
    // reglas propias (no se puede desactivar una cuenta pordefecto=1, ni
    // una con hijas activas) que solo desactivarEmpresaCuenta valida. Si
    // este PUT aceptara `estado` del body, sería una vía para saltarse
    // esas reglas por completo -tanto para desactivar como para
    // reactivar una cuenta ya desactivada.
    const { nombre, nombre_alternativo, codigo, asentable, naturaleza, moneda } = req.body;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }

        await cuenta.update({ nombre, nombre_alternativo, codigo, asentable, naturaleza, moneda });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: cuenta.id_empresa,
            tipo: 'MODIFICO_CUENTA',
            descripcion: `Modificó la cuenta "${cuenta.nombre}" (${cuenta.codigo})`,
            referencia_id: cuenta.id_empresacuenta
        });

        res.json({ msg: 'Cuenta actualizada', cuenta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar cuenta' });
    }
};

export const desactivarEmpresaCuenta = async (req, res) => {
    const { id } = req.params;

    try {
        const cuenta = await EmpresaCuenta.findByPk(id);
        if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta no encontrada' });
        }

        // Solo se pueden desactivar cuentas creadas manualmente
        // (pordefecto=0). Las cuentas del plan maestro copiadas a la
        // empresa (pordefecto=1) no pueden desactivarse desde acá.
        if (cuenta.pordefecto === 1) {
            return res.status(400).json({ msg: 'No se puede desactivar una cuenta del plan maestro' });
        }

        // id_padre guarda el id_cuenta del padre, no su id_empresacuenta;
        // hay que compararlo contra cuenta.id_cuenta (no contra `id`, que
        // es el id_empresacuenta de la URL) y scopear por empresa, porque
        // id_cuenta se repite entre empresas distintas (son copias del
        // mismo plan maestro).
        const tieneHijas = await EmpresaCuenta.findOne({
            where: { id_padre: cuenta.id_cuenta, id_empresa: cuenta.id_empresa, estado: 1 }
        });
        if (tieneHijas) {
            return res.status(400).json({ msg: 'No se puede eliminar la cuenta porque tiene cuentas hijas asociadas' });
        }

        await cuenta.update({ estado: 0 });

        await registrarMovimiento({
            id_usuario: req.usuario.id_usuario,
            id_empresa: cuenta.id_empresa,
            tipo: 'ELIMINO_CUENTA',
            descripcion: `Desactivó la cuenta "${cuenta.nombre}" (${cuenta.codigo})`,
            referencia_id: cuenta.id_empresacuenta
        });

        res.json({ msg: 'Cuenta desactivada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al desactivar cuenta' });
    }
};