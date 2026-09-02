<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[2000] pointer-events-none">
      <!-- Fondo oscurecido, cierra al tocar afuera -->
      <div class="absolute inset-0 bg-black/30 pointer-events-auto" @click="cerrar"></div>

      <!-- Panel lateral: mismo patrón visual que el selector de cuenta
           (CuentaEmpresaModal) para mantener consistencia en toda la app -->
      <div class="absolute top-0 right-0 h-full w-full max-w-md bg-slate-700 shadow-2xl flex flex-col pointer-events-auto">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 class="text-white font-semibold text-sm">{{ nombreProfesor }}</h2>
          <button type="button" class="text-slate-300 hover:text-white" @click="cerrar">
            <i class="ti ti-x text-xl"></i>
          </button>
        </div>

        <!-- Hilo de mensajes -->
        <div class="flex-1 overflow-y-auto bg-white px-4 py-3 flex flex-col gap-2">
          <p v-if="cargando" class="text-center text-gray-400 text-sm py-6">Cargando...</p>
          <p v-else-if="conversacion.length === 0" class="text-center text-gray-400 text-sm py-6">
            Todavía no hay mensajes con el profesor.
          </p>

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

        <!-- Composición -->
        <form class="border-t border-white/10 p-3 flex gap-2 bg-slate-700" @submit.prevent="enviar">
          <input
            v-model="texto"
            type="text"
            maxlength="500"
            placeholder="Escribí un mensaje..."
            class="flex-1 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 rounded-lg transition">
            Enviar
          </button>
        </form>

      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { useTiempoRealStore } from '@/stores/useTiempoRealStore'
import { obtenerConversacion, type Mensaje } from '@/services/mensajeService'

// Chat del alumno con el profesor de su sala actual. Como una sala solo
// tiene un profesor, no hace falta elegir destinatario: se arma la
// conversación directo contra seleccion.idProfesor.
const props = defineProps<{
  nombreProfesor: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const sesion = useSesionStore()
const seleccion = useSeleccionStore()
const tiempoReal = useTiempoRealStore()

const conversacion = ref<Mensaje[]>([])
const cargando = ref(false)
const texto = ref('')

const cargar = async () => {
  if (!seleccion.idProfesor) return
  cargando.value = true
  try {
    const { data } = await obtenerConversacion(seleccion.idSala, seleccion.idProfesor)
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
  if (!contenido || !seleccion.idProfesor) return

  tiempoReal.enviarMensaje(seleccion.idSala, seleccion.idProfesor, contenido)
  // Optimista: lo mostramos ya mismo, no hace falta esperar el eco del socket.
  conversacion.value.push({
    id_mensaje: Date.now(),
    id_sala: seleccion.idSala,
    id_emisor: sesion.idUsuario,
    id_receptor: seleccion.idProfesor,
    contenido,
    leido: true,
    createdAt: new Date().toISOString()
  })
  texto.value = ''
}

watch(() => tiempoReal.ultimosMensajes.length, () => {
  const ultimo = tiempoReal.ultimosMensajes[0]
  if (!ultimo || ultimo.id_emisor !== seleccion.idProfesor) return
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