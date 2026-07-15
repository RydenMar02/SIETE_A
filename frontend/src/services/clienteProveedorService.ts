import api from './api'
import type { TipoDocumento, TipoContribuyente } from './catalogoService'

export type TipoClienteProveedor = 'CLIENTE' | 'PROVEEDOR'

export interface ClienteProveedorPayload {
  tipo: TipoClienteProveedor
  razon_social: string
  numero_identificacion: string
  direccion: string
  telefono: string
  correo: string
  estado: number
  tipo_documento: TipoDocumento
  tipo_contribuyente: TipoContribuyente
  id_ciudad: number
  id_empresa: number
}

export interface ClienteProveedorItem {
  id_clienteproveedor: number
  razon_social: string
  numero_identificacion: string
}

// Forma completa que devuelve el listado (para las vistas de gestión, no solo selects)
export interface ClienteProveedorDetalle {
  id_clienteproveedor: number
  tipo: TipoClienteProveedor
  razon_social: string
  numero_identificacion: string
  direccion: string
  telefono: string
  correo: string
  estado: boolean
  tipo_documento: TipoDocumento
  tipo_contribuyente: TipoContribuyente
  id_ciudad: number
  id_empresa: number
  Ciudad?: { nombre: string }
  Empresa?: { nombre: string }
}

export const obtenerClientesProveedores = (tipo: TipoClienteProveedor, idEmpresa: number) =>
  api.get('/api/clientes-proveedores', { params: { tipo, id_empresa: idEmpresa } })

export const crearClienteProveedor = (datos: ClienteProveedorPayload) =>
  api.post('/api/clientes-proveedores', datos)

export const modificarClienteProveedor = (id: number, datos: ClienteProveedorPayload) =>
  api.put(`/api/clientes-proveedores/${id}`, datos)

export const eliminarClienteProveedor = (id: number) =>
  api.delete(`/api/clientes-proveedores/${id}`)

export const obtenerUrlReporteClientesProveedoresPdf = (tipo: TipoClienteProveedor, idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportes/clientes/pdf?id_empresa=${idEmpresa}&tipo=${tipo}`