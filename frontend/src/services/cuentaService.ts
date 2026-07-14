import api from './api'

export interface Cuenta {
  id_cuenta: number
  codigo: string
  id_empresacuenta: number
  nombre: string
}

// Forma que devuelve el endpoint de estructura (jerárquico, antes de aplanar)
export interface CuentaEstructuraRaw {
  id_cuenta: number
  id_empresacuenta: number
  codigo: string
  nombre: string
  nombre_alternativo: string
  nivel: number
  naturaleza: string
  asentable: string
  moneda: string
  rubro: string
  descripcion: string
  cuentasHijas?: CuentaEstructuraRaw[]
}

// Forma ya aplanada, la que consume la tabla
export interface CuentaAplanada extends Omit<CuentaEstructuraRaw, 'cuentasHijas'> {
  nivelIndentado: number
  id_padre: number | null
}

export const obtenerCuentas = (idEmpresa: number) =>
  api.get('/api/cuentas', { params: { id_empresa: idEmpresa } })

// Trae la estructura completa (con hijas anidadas) del plan de cuentas de la empresa
export const obtenerEstructuraCuentas = (idEmpresa: number) =>
  api.get('/api/empresa-cuentas/estructura', { params: { idempresa: idEmpresa } })

// Valida un código de cuenta ingresado a mano y trae su nombre real
export const validarCuentaPorCodigo = (codigo: string, idEmpresa: number) =>
  api.get(`/api/empresa-cuentas/codigo/${codigo}`, { params: { id_empresa: idEmpresa } })

// ---------- Plan de cuentas: alta jerárquica (grupo > subgrupo > cuenta principal > subcuenta) ----------

export interface CuentaFiltrada {
  idcuenta: number
  codigo: string
  nombre: string
  id_padre?: number | null
}

export const filtrarCuentasPorNivel = (nivel: number, idEmpresa: number, idPadre?: number) =>
  api.get('/api/empresa-cuentas/filtrar', { params: { nivel, idempresa: idEmpresa, id_padre: idPadre } })

export const obtenerCuentaEmpresaPorId = (idempresaCuenta: number) =>
  api.get(`/api/empresa-cuentas/${idempresaCuenta}`)

export interface CuentaEmpresaPayload {
  nombre: string
  nombre_alternativo: string
  codigo: string
  asentable: string
  naturaleza: string
  moneda: string
  id_padre: number | null
  nivel: number
  estado: boolean
  pordefecto: boolean
  idempresa: number
}

export const crearCuentaEmpresa = (datos: CuentaEmpresaPayload) =>
  api.post('/api/empresa-cuentas', datos)

export const modificarCuentaEmpresa = (idempresaCuenta: number, datos: CuentaEmpresaPayload) =>
  api.put(`/api/empresa-cuentas/${idempresaCuenta}`, datos)

export const eliminarCuentaEmpresa = (idempresaCuenta: number) =>
  api.delete(`/api/empresa-cuentas/${idempresaCuenta}`)