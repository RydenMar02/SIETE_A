import Empresa from "../models/empresa.js";
import SalaUsuario from "../models/salaUsuario.js";
import Cuenta from "../models/cuenta.js";
import EmpresaCuenta from "../models/empresaCuenta.js";
import { puedeAccederASalaUsuario } from "../middlewares/pertenencia.middleware.js";
import db from "../db/conexion.js";

export const getEmpresas = async (req, res) => {
  let { desde = 0, limite = 10, id_salausuario } = req.query;

  desde = parseInt(desde) || 0;
  limite = parseInt(limite) || 10;
  id_salausuario = parseInt(id_salausuario) || null;

  try {
    if (!id_salausuario) {
      return res.status(400).json({ msg: "El id_salausuario es obligatorio" });
    }

    if (!(await puedeAccederASalaUsuario(req, id_salausuario))) {
      return res.status(403).json({ msg: "No tenés permiso para ver estas empresas" });
    }

    const [total, empresas] = await Promise.all([
      Empresa.count({
        where: { estado: 1, id_salausuario },
      }),
      Empresa.findAll({
        where: { estado: 1, id_salausuario },
        offset: desde,
        limit: limite,
        order: [["id_empresa", "ASC"]],
      }),
    ]);

    if (total === 0) {
      return res
        .status(404)
        .json({ msg: "No tenés empresas en esta sala, creá una" });
    }

    res.json({ total, empresas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener empresas" });
  }
};

export const getEmpresaById = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa = await Empresa.findByPk(id);
    if (!empresa) return res.status(404).json({ msg: "Empresa no encontrada" });
    // La ruta ya aplica validarPertenenciaEmpresa antes de llegar acá.
    res.json(empresa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener empresa" });
  }
};

export const getEmpresasPorSalaUsuario = async (req, res) => {
  let { desde = 0, limite = 10, id_salausuario } = req.query;

  desde = parseInt(desde) || 0;
  limite = parseInt(limite) || 10;
  id_salausuario = parseInt(id_salausuario) || null;

  try {
    if (!id_salausuario) {
      return res.status(400).json({ msg: "El id_salausuario es obligatorio" });
    }

    if (!(await puedeAccederASalaUsuario(req, id_salausuario))) {
      return res.status(403).json({ msg: "No tenés permiso para ver estas empresas" });
    }

    const [total, empresas] = await Promise.all([
      Empresa.count({ where: { estado: 1, id_salausuario } }),
      Empresa.findAll({
        where: { estado: 1, id_salausuario },
        offset: desde,
        limit: limite,
        order: [["id_empresa", "ASC"]],
      }),
    ]);

    if (total === 0)
      return res.status(404).json({ msg: "No hay empresas en esta sala" });

    res.json({ total, empresas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener empresas" });
  }
};

export const crearEmpresa = async (req, res) => {
  // id_periodo ya no se pide: la empresa usa el/los periodos del
  // ejercicio de su sala, no tiene un periodo propio.
  const { nombre, ruc, sigla, id_salausuario } = req.body;

  try {
    if (!(await puedeAccederASalaUsuario(req, id_salausuario))) {
      return res.status(403).json({ msg: "No tenés permiso para crear una empresa en esta sala" });
    }

    const resultado = await db.transaction(async (t) => {
      const empresa = await Empresa.create({
        nombre,
        ruc,
        sigla,
        id_salausuario,
        estado: 1,
      }, { transaction: t });

      const cuentasPorDefecto = await Cuenta.findAll({
        where: { pordefecto: 1 },
        transaction: t,
      });

      const empresaCuentas = cuentasPorDefecto.map((cuenta) => ({
        id_empresa: empresa.id_empresa,
        id_cuenta: cuenta.id_cuenta,
        nombre: cuenta.nombre,
        nombre_alternativo: cuenta.nombre_alternativo || "",
        codigo: cuenta.codigo,
        asentable: cuenta.asentable,
        naturaleza: cuenta.naturaleza,
        moneda: "LOCAL",
        id_padre: cuenta.id_padre || null,
        nivel: cuenta.nivel,
        pordefecto: cuenta.pordefecto,
        estado: 1,
      }));

      await EmpresaCuenta.bulkCreate(empresaCuentas, { transaction: t });

      return empresa;
    });

    res.status(201).json({ msg: "Empresa creada correctamente", empresa: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al crear empresa" });
  }
};

export const actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, ruc, sigla } = req.body;

  try {
    const empresa = await Empresa.findByPk(id);
    if (!empresa) return res.status(404).json({ msg: "Empresa no encontrada" });
    await empresa.update({ nombre, ruc, sigla });
    res.json({ msg: "Empresa actualizada", empresa });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al actualizar empresa" });
  }
};

export const desactivarEmpresa = async (req, res) => {
  const { id } = req.params;

  try {
    const empresa = await Empresa.findByPk(id);
    if (!empresa) return res.status(404).json({ msg: "Empresa no encontrada" });
    await empresa.update({ estado: 0 });
    res.json({ msg: "Empresa desactivada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al desactivar empresa" });
  }
};