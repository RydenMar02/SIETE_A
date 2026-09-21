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
// TODO: generarBackup cuando exista contrato backend.

export interface UsuarioImportadoPreview {
  fila: number
  nombre: string
  cedula: string
  correo: string
  telefono: string
  rol: 'PROFESOR' | 'ALUMNO'
}

export interface ValidacionImportacionResponse {
  msg: string
  total: number
  usuarios: UsuarioImportadoPreview[]
}

export interface ImportacionUsuariosResponse {
  msg: string
  total: number
}

export const validarImportacionUsuarios = (archivo: File) => {
  const formData = new FormData()
  formData.append('archivo', archivo)

  return api.post<ValidacionImportacionResponse>(
    '/api/usuarios/importar/validar',
    formData
  )
}

export const importarUsuarios = (archivo: File) => {
  const formData = new FormData()
  formData.append('archivo', archivo)

  return api.post<ImportacionUsuariosResponse>(
    '/api/usuarios/importar',
    formData
  )
}

// ---------- Perfil propio ----------
// A diferencia de obtenerUsuario/modificarUsuario (rutas administrativas,
// /api/usuarios/:id, solo admin), estas dos usan /api/usuarios/perfil: el
// backend identifica al usuario exclusivamente por el JWT, nunca por un id
// que mande el frontend. Por eso el payload NO lleva id_rol ni estado -el
// backend los ignora igual si vinieran, pero ni siquiera los ofrecemos aca.
export interface MiPerfilResponse {
  id_usuario: number
  nombre: string
  cedula: string
  correo: string
  telefono: string
  id_rol: number
}

export interface MiPerfilPayload {
  nombre: string
  cedula: string
  correo: string
  telefono: string
}

export const obtenerMiPerfil = () =>
  api.get<MiPerfilResponse>('/api/usuarios/perfil')

export const actualizarMiPerfil = (datos: MiPerfilPayload) =>
  api.put('/api/usuarios/perfil', datos)

export interface  CambiarContrasenaPayload {
  contra_actual: string
  contra_nueva: string
}

export const cambiarMiPassword = (datos:  CambiarContrasenaPayload) =>
  api.put('/api/usuarios/cambiar-password', datos)