import api from './api'

export interface Sucursal {
  id_sucursal: number
  nombre: string
}

export const obtenerSucursales = (idEmpresa: number) =>
  api.get('/api/sucursales', { params: { id_empresa: idEmpresa } })

// ---------- Gestión completa (crear/modificar/eliminar) ----------

export interface SucursalDetalle {
  id_sucursal: number
  codigo: string
  nombre: string
  id_empresa?: number
  nombre_empresa?: string
  telefono: string
  responsable: string
}

export interface SucursalPayload {
  codigo: string
  nombre: string
  id_empresa: number
  telefono: string
  responsable: string
  estado: boolean
}

export const crearSucursal = (datos: SucursalPayload) =>
  api.post('/api/sucursales', datos)

export const modificarSucursal = (idSucursal: number, datos: Partial<SucursalPayload>) =>
  api.put(`/api/sucursales/${idSucursal}`, datos)

export const eliminarSucursal = (idSucursal: number) =>
  api.delete(`/api/sucursales/${idSucursal}`)