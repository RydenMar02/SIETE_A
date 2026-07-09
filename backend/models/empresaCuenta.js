import { DataTypes } from "sequelize";
import db from "../db/conexion.js";
import Empresa from "./empresa.js";

const EmpresaCuenta = db.define(
  "EmpresaCuenta",
  {
    id_empresacuenta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_cuenta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_padre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    nombre_alternativo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    asentable: {
      type: DataTypes.ENUM("Si", "No"),
      allowNull: false,
    },
    naturaleza: {
      type: DataTypes.ENUM("ACREEDORA", "DEUDORA"),
      allowNull: false,
    },
    moneda: {
      type: DataTypes.ENUM("LOCAL", "EXTRANJERA"),
      allowNull: false,
    },
    nivel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pordefecto: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    estado: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "empresa_cuenta",
    timestamps: true,
    updatedAt: "updateAt",
  },
);

EmpresaCuenta.belongsTo(Empresa, { foreignKey: "id_empresa" });

export default EmpresaCuenta;
