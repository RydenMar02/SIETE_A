import api from './api'

export interface Periodo {
  id_periodo: number
  periodo: string
}

export const obtenerPeriodos = () => api.get('/api/periodos')