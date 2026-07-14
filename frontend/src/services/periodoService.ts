import api from './api'

export interface Periodo {
  id_periodo: number
  periodo: string
}

export interface PeriodoPayload {
  periodo: string
}

export const obtenerPeriodos = () => api.get('/api/periodos')

export const crearPeriodo = (datos: PeriodoPayload) =>
  api.post('/api/periodos', datos)

export const modificarPeriodo = (idPeriodo: number, datos: PeriodoPayload) =>
  api.put(`/api/periodos/${idPeriodo}`, datos)

export const eliminarPeriodo = (idPeriodo: number) =>
  api.delete(`/api/periodos/${idPeriodo}`)