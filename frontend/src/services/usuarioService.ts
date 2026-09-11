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

export interface UsuarioAdmin extends UsuarioPerfil {
  estado: number | boolean
}
export type NuevoUsuarioDatos = Omit<UsuarioPerfil, 'id_usuario'>
export const listarUsuarios = () => api.get<UsuarioAdmin[]>('/api/usuarios')
// Rutas auditadas en usuarios.routes.js. La contraseña se cifra en el backend.
export const crearUsuarioAdmin = (datos: NuevoUsuarioDatos) =>
  api.post('/api/usuarios', { ...datos, contra: '12345678' })
export const restablecerPassword = (usuario: UsuarioAdmin) =>
  api.put(`/api/usuarios/${usuario.id_usuario}`, {
    nombre: usuario.nombre, cedula: usuario.cedula, correo: usuario.correo,
    telefono: usuario.telefono, id_rol: usuario.id_rol, contra: '12345678'
  })
// TODO: importarUsuariosExcel y generarBackup cuando exista contrato backend.
