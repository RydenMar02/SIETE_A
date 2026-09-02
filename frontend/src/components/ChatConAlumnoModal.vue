<template>
  <div class="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4" @click.self="cerrar">
    <div class="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p class="font-semibold text-gray-900">{{ nombreAlumno }}</p>
        <button type="button" class="text-gray-400 hover:text-gray-600" @click="cerrar">
          <i class="ti ti-x text-lg"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <p v-if="cargando" class="text-center text-gray-400 text-sm py-6">Cargando...</p>
        <p v-else-if="conversacion.length === 0" class="text-center text-gray-400 text-sm py-6">Todavía no hay mensajes con este alumno.</p>

        <div
          v-for="mensaje in conversacion"
          :key="mensaje.id_mensaje"
          class="max-w-[80%] rounded-lg px-3 py-2 text-sm"
          :class="mensaje.id_emisor === sesion.idUsuario
            ? 'bg-green-600 text-white self-end'
            : 'bg-gray-100 text-gray-800 self-start'"
        >
          {{ mensaje.contenido }}
        </div>
      </div>

      <form class="border-t border-gray-100 p-3 flex gap-2" @submit.prevent="enviar">
        <input
          v-model="texto"
          type="text"
          maxlength="500"
          placeholder="Escribí un comentario..."
          class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 rounded-lg transition">
          Enviar
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useTiempoRealStore } from '@/stores/useTiempoRealStore'
import { obtenerConversacion, type Mensaje } from '@/services/mensajeService'

// Modal de chat con un alumno puntual, dentro de una sala. Se usa desde
// "Seguimiento en aula" (al hacer click en "Mensaje" sobre un alumno) y
// desde la campanita de Notificaciones (al hacer click en un mensaje
// entrante), así el profesor tiene un único componente de chat sin
// importar desde dónde lo abre.
const props = defineProps<{
  idSala: number
  idAlumno: number
  nombreAlumno: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const sesion = useSesionStore()
const tiempoReal = useTiempoRealStore()

const conversacion = ref<Mensaje[]>([])
const cargando = ref(false)
const texto = ref('')

const cargar = async () => {
  cargando.value = true
  try {
    const { data } = await obtenerConversacion(props.idSala, props.idAlumno)
    conversacion.value = data?.mensajes ?? []
  } catch (error) {
    console.error('Error al cargar la conversación:', error)
  } finally {
    cargando.value = false
  }
}

const cerrar = () => emit('cerrar')

const enviar = () => {
  const contenido = texto.value.trim()
  if (!contenido) return

  tiempoReal.enviarMensaje(props.idSala, props.idAlumno, contenido)
  // Optimista: lo mostramos ya mismo, no hace falta esperar el eco del socket.
  conversacion.value.push({
    id_mensaje: Date.now(),
    id_sala: props.idSala,
    id_emisor: sesion.idUsuario,
    id_receptor: props.idAlumno,
    contenido,
    leido: true,
    createdAt: new Date().toISOString()
  })
  texto.value = ''
}

watch(() => tiempoReal.ultimosMensajes.length, () => {
  const ultimo = tiempoReal.ultimosMensajes[0]
  if (!ultimo || ultimo.id_emisor !== props.idAlumno) return
  conversacion.value.push({
    id_mensaje: ultimo.id_mensaje,
    id_sala: ultimo.id_sala,
    id_emisor: ultimo.id_emisor,
    id_receptor: ultimo.id_receptor,
    contenido: ultimo.contenido,
    leido: true,
    createdAt: ultimo.createdAt
  })
})

onMounted(cargar)
</script>