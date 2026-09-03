import api from './api'

export interface Movimiento {
  id_movimiento: number
  id_usuario: number
  id_empresa: number
  tipo: string
  descripcion: string
  referencia_id: number | null
  createdAt: string
  Usuario?: { nombre: string; cedula: string }
  Empresa?: { nombre: string }
}

export const obtenerMovimientosPorSala = (idSala: number, desde = 0, limite = 50) =>
  api.get('/api/movimientos', { params: { id_sala: idSala, desde, limite } })