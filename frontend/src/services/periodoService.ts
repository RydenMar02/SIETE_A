import api from './api'

// Los periodos ya no se crean/editan/borran sueltos: se generan
// automáticamente (los 12 meses) al crear el Ejercicio de una sala (ver
// ejercicioService.ts / salaService.ts). Este archivo se limita a listarlos
// y a abrir/cerrar un mes puntual — que es exactamente lo que expone
// periodo.routes.js en el backend real (GET / y PATCH /:id/estado, nada más).

export interface Periodo {
  id_periodo: number
  id_ejercicio: number
  mes: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'ABIERTO' | 'CERRADO'
}

export const obtenerPeriodosPorEjercicio = (idEjercicio: number) =>
  api.get('/api/periodos', { params: { id_ejercicio: idEjercicio } })

export const obtenerPeriodoPorId = (idPeriodo: number) =>
  api.get(`/api/periodos/${idPeriodo}`)

export const cambiarEstadoPeriodo = (idPeriodo: number, estado: 'ABIERTO' | 'CERRADO') =>
  api.patch(`/api/periodos/${idPeriodo}/estado`, { estado })