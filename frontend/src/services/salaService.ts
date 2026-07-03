import api from './api'

// ---------- Tipos ----------

export interface SalaPayload {
  sala: string
  contra: string
  curso: string
  semestre: string
  id_usuario: number
  estado: boolean
}

export interface IngresoSalaPayload {
  id_sala: number
  contrasena: string
  tipo: 'ALUMNO' | 'PROFESOR'
  idusuario_alumno: number
  idusuario_docente: number
  baja: boolean
  estado: boolean
}

export interface SalaUsuariosParams {
  curso: string
  semestre: string
  rol: number
  id_usuario?: number
}

export interface SeleccionSalaParams {
  curso: string
  semestre: string
  id_usuario: number
  id_sala: number
  tipo: 'ALUMNO' | 'PROFESOR'
}

// ---------- Crear / modificar / consultar una sala ----------

export const crearSala = (datos: SalaPayload) =>
  api.post('/api/salas', datos)

export const modificarSala = (idSala: number, datos: Partial<SalaPayload>) =>
  api.put(`/api/salas/${idSala}`, datos)

// Se usa para comparar la contraseña ingresada contra la real al ingresar a una sala
export const obtenerSala = (idSala: number) =>
  api.get(`/api/salas/${idSala}`)

// ---------- Listado de salas por curso/semestre/rol ----------

export const obtenerSalasPorCursoSemestre = (params: SalaUsuariosParams) =>
  api.get('/api/sala-usuarios', { params })

// ---------- Ingresar a una sala (crear la relación sala-usuario) ----------

export const ingresarASala = (datos: IngresoSalaPayload) =>
  api.post('/api/sala-usuarios', datos)

// Trae la relación sala-usuario ya existente al seleccionar una sala (no ingresar por contraseña)
export const obtenerRelacionSalaUsuario = (params: SeleccionSalaParams) =>
  api.get('/api/salaUsuarios/usuario', { params })