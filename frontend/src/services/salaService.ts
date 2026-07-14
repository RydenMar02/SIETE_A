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
  id_alumno: number
  id_profesor: number
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
  api.get('/api/sala-usuarios/usuario', { params })

export const obtenerAlumnosDeSala = (idSala: number, idUsuario: number) =>
  api.get(`/api/salas/${idSala}/alumnos`, { params: { id_usuario: idUsuario } })
 
// El original usaba DELETE /api/crearsalas/:id, que no coincide con el resto
// de los endpoints de sala (todos bajo /api/salas). Se corrige acá para
// seguir el mismo patrón — si el backend todavía expone solo la ruta vieja,
// avisar para ajustar esta única línea.
export const eliminarSala = (idSala: number) =>
  api.delete(`/api/salas/${idSala}`)
 
// Trae las salas creadas por un usuario (profesor), sin filtrar por curso/semestre
export const obtenerSalasDeUsuario = (idUsuario: number) =>
  api.get('/api/salas', { params: { id_usuario: idUsuario } })