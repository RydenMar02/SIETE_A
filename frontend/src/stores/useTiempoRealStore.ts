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

// Lo que un alumno va reportando de lo que está haciendo (no video, solo
// el estado de su formulario) mientras algún profesor lo está espectando.
export interface EstadoAppAlumno {
  id_alumno: number
  ruta: string
  formulario: Record<string, unknown>
  timestamp: number
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

  // ---------- Espectar (lado profesor: qué está viendo ahora) ----------
  // Solo el estado del último alumno espectado activamente — no tiene
  // sentido cachear a todos, el panel muestra uno por vez.
  const estadoEspectado = ref<EstadoAppAlumno | null>(null)

  // ---------- Espectar (lado alumno: me están mirando o no) ----------
  const siendoEspectado = ref(false)

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

    // Lado profesor: llega el estado del alumno que se está espectando.
    socket.on('estado-app-actualizado', (estado: EstadoAppAlumno) => {
      estadoEspectado.value = estado
    })

    // Lado alumno: un profesor empezó/dejó de mirarme.
    socket.on('te-estan-espectando', () => {
      siendoEspectado.value = true
    })
    socket.on('dejaron-de-espectarte', () => {
      siendoEspectado.value = false
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
    estadoEspectado.value = null
    siendoEspectado.value = false
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

  // ---------- Espectar (lado profesor) ----------
  const espectarAlumno = (idSala: number, idAlumno: number) => {
    estadoEspectado.value = null // limpiamos lo del alumno anterior mientras llega lo nuevo
    socket?.emit('espectar-alumno', { id_sala: idSala, id_alumno: idAlumno })
  }

  const dejarDeEspectar = (idSala: number, idAlumno: number) => {
    socket?.emit('dejar-de-espectar', { id_sala: idSala, id_alumno: idAlumno })
    estadoEspectado.value = null
  }

  // ---------- Espectar (lado alumno) ----------
  // No emitimos si no hay nadie espectando (siendoEspectado en false):
  // evita mandar cada tecla que tipea el alumno cuando no hace falta.
  const emitirEstadoApp = (idSala: number, ruta: string, formulario: Record<string, unknown>) => {
    if (!siendoEspectado.value) return
    socket?.emit('estado-app-actualizado', { id_sala: idSala, ruta, formulario })
  }

  return {
    conectado, presencia, mensajesNoLeidos, ultimosMensajes, estadoEspectado, siendoEspectado,
    conectar, desconectar, unirseSala, reportarActividad, enviarMensaje, marcarMensajesLeidos,
    espectarAlumno, dejarDeEspectar, emitirEstadoApp
  }
})