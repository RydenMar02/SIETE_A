import api from './api'

export interface Sucursal {
  id_sucursal: number
  nombre: string
}

export const obtenerSucursales = (idEmpresa: number) =>
  api.get('/api/sucursales', { params: { id_empresa: idEmpresa } })