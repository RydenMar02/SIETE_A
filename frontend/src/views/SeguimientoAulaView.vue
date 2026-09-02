<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Seguimiento en aula</h2>
            <span class="text-sm text-gray-500">{{ seleccion.nombreSala || 'Sin sala' }}</span>
          </div>

          <p v-if="!seleccion.idSala" class="text-gray-500 text-sm">
            No hay una sala seleccionada. Volvé a <router-link to="/seleccion" class="text-green-700 underline">seleccionar tu sala</router-link> para ver el seguimiento.
          </p>

          <template v-else>
            <p v-if="cargandoAlumnos" class="text-gray-400 text-sm">Cargando alumnos...</p>
            <p v-else-if="alumnos.length === 0" class="text-gray-500 text-sm">Todavía no hay alumnos registrados en esta sala.</p>

            <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="alumno in alumnosConPresencia"
                :key="alumno.id_usuario"
                class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :class="alumno.conectado ? 'bg-green-500' : 'bg-gray-300'"
                  ></span>
                  <p class="font-medium text-gray-900 truncate">{{ alumno.nombre }}</p>
                </div>

                <p class="text-xs text-gray-500">
                  <span v-if="alumno.conectado">
                    En {{ etiquetaPagina(alumno.pagina) }} · hace {{ tiempoRelativo(alumno.ultimaActividad) }}
                  </span>
                  <span v-else>Desconectado</span>
                </p>

                <div class="flex gap-2 mt-1">
                  <button
                    type="button"
                    class="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium py-1.5 rounded-md transition"
                    @click="abrirConversacion(alumno)"
                  >
                    Mensaje
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Próximamente"
                    class="flex-1 bg-gray-200 text-gray-400 text-xs font-medium py-1.5 rounded-md cursor-not-allowed"
                  >
                    Espectar
                  </button>
                </div>
              </div>
            </div>
          </template>

        </div>
      </main>
    </div>

    <!-- Chat con el alumno seleccionado: mismo componente que abre la
         campanita de Notificaciones cuando le llega un mensaje nuevo. -->
    <ChatConAlumnoModal
      v-if="alumnoSeleccionado"
      :id-sala="seleccion.idSala"
      :id-alumno="alumnoSeleccionado.id_usuario"
      :nombre-alumno="alumnoSeleccionado.nombre"
      @cerrar="alumnoSeleccionado = null"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ChatConAlumnoModal from '@/components/ChatConAlumnoModal.vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { useTiempoRealStore, type AlumnoPresencia } from '@/stores/useTiempoRealStore'
import { obtenerAlumnosDeSala } from '@/services/salaService'

const sesion = useSesionStore()
const seleccion = useSeleccionStore()
const tiempoReal = useTiempoRealStore()

// ---------- Roster de alumnos (dato "frío", vía REST) ----------
interface Alumno {
  id_usuario: number
  nombre: string
  cedula: string
}

const alumnos = ref<Alumno[]>([])
const cargandoAlumnos = ref(true)

const cargarAlumnos = async () => {
  if (!seleccion.idSala) return
  cargandoAlumnos.value = true
  try {
    const { data } = await obtenerAlumnosDeSala(seleccion.idSala, sesion.idUsuario)
    alumnos.value = data?.alumnos ?? []
  } catch (error) {
    console.error('Error al cargar alumnos:', error)
  } finally {
    cargandoAlumnos.value = false
  }
}

// ---------- Combinación con la presencia en vivo (dato "caliente", vía socket) ----------
const alumnosConPresencia = computed(() => {
  return alumnos.value.map((alumno) => {
    const presencia: AlumnoPresencia | undefined = tiempoReal.presencia[alumno.id_usuario]
    return {
      ...alumno,
      conectado: !!presencia,
      pagina: presencia?.pagina ?? null,
      ultimaActividad: presencia?.ultimaActividad ?? 0
    }
  })
})

const ETIQUETAS_PAGINA: Record<string, string> = {
  '/menu': 'Inicio',
  '/asiento': 'Asientos contables',
  '/cliente': 'Clientes',
  '/proveedor': 'Proveedores',
  '/empresa': 'Empresas',
  '/sucursal': 'Sucursales',
  '/cuentas': 'Plan de cuentas',
  '/compra': 'Compras',
  '/venta': 'Ventas',
  '/perfil': 'Perfil',
  '/seguimiento-aula': 'Seguimiento en aula'
}
const etiquetaPagina = (pagina: string | null) => (pagina ? (ETIQUETAS_PAGINA[pagina] ?? pagina) : 'el sistema')

// Ticker para que "hace X" se actualice solo, sin recargar la página
const ahora = ref(Date.now())
setInterval(() => { ahora.value = Date.now() }, 5000)

const tiempoRelativo = (timestamp: number) => {
  if (!timestamp) return '—'
  const segundos = Math.max(0, Math.floor((ahora.value - timestamp) / 1000))
  if (segundos < 60) return `${segundos}s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `${minutos} min`
  return `${Math.floor(minutos / 60)} h`
}

// ---------- Conversación con un alumno ----------
const alumnoSeleccionado = ref<Alumno | null>(null)

// Abrir/cerrar solo cambia qué alumno está seleccionado — cargar la
// conversación y enviar mensajes ahora es responsabilidad de
// ChatConAlumnoModal (también lo usa la campanita de Notificaciones).
const abrirConversacion = (alumno: Alumno) => {
  alumnoSeleccionado.value = alumno
}

onMounted(() => {
  if (seleccion.idSala) {
    tiempoReal.unirseSala(seleccion.idSala)
    cargarAlumnos()
  }
})
</script>