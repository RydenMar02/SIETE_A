import api from './api'

export interface LoginPayload {
  cedula: string
  contra: string
}

export interface UsuarioLogueado {
  id_usuario: number
  nombre: string
  id_rol: number
}

export interface LoginResponse {
  token: string
  usuario: UsuarioLogueado
}

export const login = (datos: LoginPayload) =>
  api.post<LoginResponse>('/api/auth/login', datos)