import { DataTypes } from "sequelize";
import db from "../db/conexion.js";
import ClienteProveedor from "./clienteProveedor.js";
import Sucursal from "./sucursal.js";
import EmpresaCuenta from "./empresaCuenta.js";

const CompraVenta = db.define(
  "CompraVenta",
  {
    id_compraventa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_sucursal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_clienteproveedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_cuentaexenta: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_cuentagrav10: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_cuentagrav05: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM("VENTA", "COMPRA"),
      allowNull: false,
    },
    numero_factura: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    numero_timbrado: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipo_de_factura: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    condicion: {
      type: DataTypes.ENUM("CONTADO", "CREDITO"),
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_factura: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    exenta: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    base_imp_iva_10: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    base_imp_iva_05: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    importe_iva_10: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    importe_iva_05: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    gravada10: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    gravada05: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    moneda: {
      type: DataTypes.ENUM("LOCAL", "EXTRANJERA"),
      allowNull: false,
    },
    concepto: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    imputada: {
      type: DataTypes.ENUM("SI", "NO"),
      allowNull: false,
    },
    estado: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    descripcion_exenta: {
      type: DataTypes.STRING(100),
      allowNull: false, 
    },
    descripcion_iva10: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descripcion_iva5: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "compra_venta",
    timestamps: true,
  },
);

CompraVenta.belongsTo(ClienteProveedor, { foreignKey: "id_clienteproveedor" });
CompraVenta.belongsTo(Sucursal, { foreignKey: "id_sucursal" });
CompraVenta.belongsTo(EmpresaCuenta, {
  foreignKey: "id_cuentaexenta",
  as: "cuentaExenta",
});
CompraVenta.belongsTo(EmpresaCuenta, {
  foreignKey: "id_cuentagrav10",
  as: "cuentaGrav10",
});
CompraVenta.belongsTo(EmpresaCuenta, {
  foreignKey: "id_cuentagrav05",
  as: "cuentaGrav05",
});

export default CompraVenta;
