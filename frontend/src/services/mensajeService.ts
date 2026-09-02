import api from './api'

export interface Mensaje {
  id_mensaje: number
  id_sala: number
  id_emisor: number
  id_receptor: number
  contenido: string
  leido: boolean
  createdAt: string
  Emisor?: { id_usuario: number; nombre: string }
}

// Historial completo dirigido al usuario logueado (para la campanita)
export const obtenerMensajesRecibidos = () =>
  api.get('/api/mensajes/recibidos')

// Conversación puntual con un alumno/profesor dentro de una sala
export const obtenerConversacion = (idSala: number, idUsuario: number) =>
  api.get('/api/mensajes/conversacion', { params: { id_sala: idSala, id_usuario: idUsuario } })

export const marcarTodosLeidos = () =>
  api.patch('/api/mensajes/marcar-leidos')