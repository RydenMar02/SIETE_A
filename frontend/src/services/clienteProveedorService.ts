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
  idcliente_proveedor: number
  razon_social: string
  numero_identificacion: string
}

export const obtenerClientesProveedores = (tipo: TipoClienteProveedor, idEmpresa: number) =>
  api.get('/api/clientesproveedores', { params: { tipo, id_empresa: idEmpresa } })

export const crearClienteProveedor = (datos: ClienteProveedorPayload) =>
  api.post('/api/clientesproveedores', datos)

export const modificarClienteProveedor = (id: number, datos: ClienteProveedorPayload) =>
  api.put(`/api/clientesproveedores/${id}`, datos)