import api from './api'
import type { Periodo } from './periodoService'

export interface Ejercicio {
  id_ejercicio: number
  id_sala: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'ABIERTO' | 'CERRADO'
  // Solo viene incluido cuando el endpoint hace el include (getEjercicioById)
  Periodos?: Periodo[]
}

export interface EjercicioPayload {
  id_sala: number
  nombre: string
  anio: number
}

// Todos los ejercicios de una sala, más reciente primero (así ya lo ordena
// el backend). Se usa para derivar "cuál es el ejercicio activo" del lado
// del cliente, ya que no existe un endpoint que lo resuelva directamente.
export const obtenerEjerciciosPorSala = (idSala: number) =>
  api.get('/api/ejercicios', { params: { id_sala: idSala } })

export const obtenerEjercicioPorId = (idEjercicio: number) =>
  api.get(`/api/ejercicios/${idEjercicio}`)

// Crea el ejercicio (el backend genera solo los 12 periodos). SalaModal la
// llama justo después de crearSala, encadenando las dos llamadas, porque
// crearSala no crea el ejercicio por sí sola.
export const crearEjercicio = (datos: EjercicioPayload) =>
  api.post('/api/ejercicios', datos)

export const cerrarEjercicio = (idEjercicio: number) =>
  api.patch(`/api/ejercicios/${idEjercicio}/cerrar`)