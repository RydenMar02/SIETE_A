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

// Trae la estructura completa (con hijas anidadas) del plan de cuentas de la empresa.
// El backend lee req.query.id_empresa (con guión bajo) — antes se mandaba
// "idempresa" sin guión bajo, por eso llegaba vacío y tiraba 400.
export const obtenerEstructuraCuentas = (idEmpresa: number) =>
  api.get('/api/empresa-cuentas/estructura', { params: { id_empresa: idEmpresa } })

// Valida un código de cuenta ingresado a mano y trae su nombre real
export const validarCuentaPorCodigo = (codigo: string, idEmpresa: number) =>
  api.get(`/api/empresa-cuentas/codigo/${codigo}`, { params: { id_empresa: idEmpresa } })

// ---------- Plan de cuentas: alta jerárquica (grupo > subgrupo > cuenta principal > subcuenta) ----------

// Campos confirmados directo del backend (getCuentasPorNivelYPadre):
// no existe "idcuenta" — son "id_empresacuenta" (PK propia de esta fila,
// la que se usa para la jerarquía id_padre) e "id_cuenta" (referencia a
// un catálogo genérico, no interviene en la jerarquía).
export interface CuentaFiltrada {
  id_empresacuenta: number
  id_cuenta: number
  codigo: string
  nombre: string
  nivel: number
  id_padre: number | null
  id_empresa: number
}

// La ruta real es "/filtro", no "/filtrar" (confirmado con la pestaña Network).
export const filtrarCuentasPorNivel = (nivel: number, idEmpresa: number, idPadre?: number) =>
  api.get('/api/empresa-cuentas/filtro', { params: { nivel, id_empresa: idEmpresa, id_padre: idPadre } })

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
  id_empresa: number
}

export const crearCuentaEmpresa = (datos: CuentaEmpresaPayload) =>
  api.post('/api/empresa-cuentas', datos)

export const modificarCuentaEmpresa = (id_empresaCuenta: number, datos: CuentaEmpresaPayload) =>
  api.put(`/api/empresa-cuentas/${id_empresaCuenta}`, datos)

export const eliminarCuentaEmpresa = (id_empresaCuenta: number) =>
  api.delete(`/api/empresa-cuentas/${id_empresaCuenta}`)