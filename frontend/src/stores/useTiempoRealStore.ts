import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useSesionStore } from './useSesionStore'

export interface AlumnoPresencia {
  id_usuario: number
  nombre: string
  pagina: string | null
  ultimaActividad: number
}

export interface MensajeEnVivo {
  id_mensaje: number
  id_sala: number
  id_emisor: number
  nombreEmisor: string
  id_receptor: number
  contenido: string
  createdAt: string
}

// No lleva persist: true a propósito — el socket no se puede serializar, y
// no tiene sentido "recordar" una conexión entre recargas: se reconecta
// sola apenas el Navbar vuelve a montar.
export const useTiempoRealStore = defineStore('tiempoReal', () => {
  let socket: Socket | null = null
  let salaUnida: number | null = null

  const conectado = ref(false)
  const presencia = ref<Record<number, AlumnoPresencia>>({})
  const mensajesNoLeidos = ref(0)
  const ultimosMensajes = ref<MensajeEnVivo[]>([])

  const conectar = () => {
    if (socket) return

    const sesion = useSesionStore()
    if (!sesion.token) return

    socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: sesion.token }
    })

    socket.on('connect', () => {
      conectado.value = true
      // Si veníamos de una desconexión (ej. se cortó la red un segundo) y
      // ya había una sala unida, la volvemos a unir al reconectar.
      if (salaUnida) {
        const salaPendiente = salaUnida
        salaUnida = null
        unirseSala(salaPendiente)
      }
    })

    socket.on('disconnect', () => {
      conectado.value = false
      presencia.value = {}
    })

    socket.on('presencia-actualizada', (lista: AlumnoPresencia[]) => {
      const mapa: Record<number, AlumnoPresencia> = {}
      lista.forEach((a) => { mapa[a.id_usuario] = a })
      presencia.value = mapa
    })

    socket.on('nuevo-mensaje', (mensaje: MensajeEnVivo) => {
      ultimosMensajes.value.unshift(mensaje)
    })

    socket.on('contador-no-leidos', (cantidad: number) => {
      mensajesNoLeidos.value = cantidad
    })
  }

  const desconectar = () => {
    socket?.disconnect()
    socket = null
    salaUnida = null
    conectado.value = false
    presencia.value = {}
    mensajesNoLeidos.value = 0
    ultimosMensajes.value = []
  }

  const unirseSala = (idSala: number) => {
    if (!idSala || salaUnida === idSala) return
    salaUnida = idSala
    socket?.emit('unirse-sala', { id_sala: idSala })
  }

  const reportarActividad = (pagina: string) => {
    socket?.emit('actividad', { pagina })
  }

  const enviarMensaje = (idSala: number, idReceptor: number, contenido: string) => {
    socket?.emit('enviar-mensaje', { id_sala: idSala, id_receptor: idReceptor, contenido })
  }

  const marcarMensajesLeidos = () => {
    mensajesNoLeidos.value = 0
    socket?.emit('marcar-leidos')
  }

  return {
    conectado, presencia, mensajesNoLeidos, ultimosMensajes,
    conectar, desconectar, unirseSala, reportarActividad, enviarMensaje, marcarMensajesLeidos
  }
})