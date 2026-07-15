import { Op, fn, col, literal } from 'sequelize';
import CompraVenta from '../models/compraventa.js';
import Sucursal from '../models/sucursal.js';
import Empresa from '../models/empresa.js';
import ClienteProveedor from '../models/clienteproveedor.js';

// 1. Top sucursales (ventas + compras)
export const getTopSucursales = async (req, res) => {
  const { empresaId } = req.params;

  try {
    const rows = await CompraVenta.findAll({
      attributes: [
        [col("Sucursal.id_sucursal"), "id_sucursal"],
        [col("Sucursal.nombre"), "nombre_sucursal"],
        [col("Sucursal.Empresa.id_empresa"), "id_empresa"],
        [col("Sucursal.Empresa.nombre"), "nombre_empresa"],
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN CompraVenta.tipo='VENTA' AND ClienteProveedor.estado=1 THEN CompraVenta.total_factura ELSE 0 END"
            )
          ),
          "total_ventas"
        ],
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN CompraVenta.tipo='COMPRA' AND ClienteProveedor.estado=1 THEN CompraVenta.total_factura ELSE 0 END"
            )
          ),
          "total_compras"
        ]
      ],
      include: [
        {
          model: Sucursal,
          attributes: [],
          where: { estado: 1 },
          include: [
            {
              model: Empresa,
              attributes: [],
              where: { id_empresa: empresaId, estado: 1 }
            }
          ]
        },
        {
          model: ClienteProveedor,
          attributes: [],
          where: { estado: 1 } // clientes y proveedores activos
        }
      ],
      where: { estado: 1 },
      group: [col("Sucursal.id_sucursal"), col("Sucursal.nombre")],
      order: [[literal("total_ventas + total_compras"), "DESC"]],
      limit: 5,
      raw: true
    });

    res.json(rows);
  } catch (error) {
    console.error("Error ORM en top sucursales:", error);
    res.status(500).json({ msg: "Hable con el administrador" });
  }
};

// 2. Top clientes por sucursal (solo ventas)
export const getTopClientesPorSucursal = async (req, res) => {
  const { empresaId } = req.params;

  try {
    const rows = await CompraVenta.findAll({
      attributes: [
        [col("Sucursal.id_sucursal"), "id_sucursal"],
        [col("Sucursal.nombre"), "nombre_sucursal"],
        [col("Sucursal.Empresa.id_empresa"), "id_empresa"],
        [col("Sucursal.Empresa.nombre"), "nombre_empresa"],
        [col("ClienteProveedor.razon_social"), "razon_social"],
        [col("ClienteProveedor.tipo"), "tipo"],
        [fn("SUM", col("CompraVenta.total_factura")), "total_ventas"]
      ],
      include: [
        {
          model: Sucursal,
          attributes: [],
          where: { estado: 1 },
          include: [
            {
              model: Empresa,
              attributes: [],
              where: { id_empresa: empresaId, estado: 1 }
            }
          ]
        },
        {
          model: ClienteProveedor,
          attributes: [],
          where: { estado: 1, tipo: "CLIENTE" } // solo clientes
        }
      ],
      where: { estado: 1, tipo: "VENTA" },
      group: [
        col("Sucursal.id_sucursal"),
        col("Sucursal.nombre"),
        col("Sucursal.Empresa.id_empresa"),
        col("Sucursal.Empresa.nombre"),
        col("ClienteProveedor.razon_social")
      ],
      order: [[literal("total_ventas"), "DESC"]],
      limit: 5,
      raw: true
    });

    res.json(rows);
  } catch (error) {
    console.error("Error ORM en top clientes por sucursal:", error);
    res.status(500).json({ msg: "Hable con el administrador" });
  }
};

// 3. Top proveedores por sucursal (solo compras)
export const getTopProveedoresPorSucursal = async (req, res) => {
  const { empresaId } = req.params;

  try {
    const rows = await CompraVenta.findAll({
      attributes: [
        [col("Sucursal.id_sucursal"), "id_sucursal"],
        [col("Sucursal.nombre"), "nombre_sucursal"],
        [col("Sucursal.Empresa.id_empresa"), "id_empresa"],
        [col("Sucursal.Empresa.nombre"), "nombre_empresa"],
        [col("ClienteProveedor.razon_social"), "razon_social"],
        [col("ClienteProveedor.tipo"), "tipo"],
        [fn("SUM", col("CompraVenta.total_factura")), "total_compras"]
      ],
      include: [
        {
          model: Sucursal,
          attributes: [],
          where: { estado: 1 },
          include: [
            {
              model: Empresa,
              attributes: [],
              where: { id_empresa: empresaId, estado: 1 }
            }
          ]
        },
        {
          model: ClienteProveedor,
          attributes: [],
          where: { estado: 1, tipo: "PROVEEDOR" } // solo proveedores
        }
      ],
      where: { estado: 1, tipo: "COMPRA" },
      group: [
        col("Sucursal.id_sucursal"),
        col("Sucursal.nombre"),
        col("Sucursal.Empresa.id_empresa"),
        col("Sucursal.Empresa.nombre"),
        col("ClienteProveedor.razon_social")
      ],
      order: [[literal("total_compras"), "DESC"]],
      limit: 5,
      raw: true
    });

    res.json(rows);
  } catch (error) {
    console.error("Error ORM en top proveedores por sucursal:", error);
    res.status(500).json({ msg: "Hable con el administrador" });
  }
};