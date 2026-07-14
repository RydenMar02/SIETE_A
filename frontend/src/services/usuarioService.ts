import api from './api'

export interface UsuarioPerfil {
  id_usuario: number
  nombre: string
  cedula: string
  correo: string
  telefono: string
  id_rol: number
}

export interface UsuarioPayload {
  nombre: string
  cedula: string
  correo: string
  telefono: string
  id_rol: number
  estado: boolean
}

export const obtenerUsuario = (idUsuario: number) =>
  api.get(`/api/usuarios/${idUsuario}`)

export const modificarUsuario = (idUsuario: number, datos: UsuarioPayload) =>
  api.put(`/api/usuarios/${idUsuario}`, datos)