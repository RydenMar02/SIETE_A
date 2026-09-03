<template>
  <header class="sticky top-0 z-30 bg-white shadow flex items-center justify-between px-3 py-2 md:px-4">

    <!-- Logo + botón de sidebar (mobile) -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="md:hidden p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menú lateral"
        @click="$emit('toggle-sidebar')"
      >
        <Icon icon="mdi:menu" width="24" />
      </button>

      <router-link to="/menu" class="flex items-center px-2">
        <img src="../assets/logoConta432x432.png" alt="Logo" width="40" />
      </router-link>
    </div>

    <!-- Enlaces: pantallas md en adelante -->
    <nav class="hidden md:flex items-center gap-1">
      <span class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700">
        <Icon icon="mdi:account-tag-outline" width="20" />
        {{ rolLabel }}
      </span>

      <router-link to="/profile" class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition">
        <Icon icon="mdi:account-circle-outline" width="20" />
        Perfil
      </router-link>

      <button
        type="button"
        class="relative flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition"
        @click="toggleNotificaciones"
      >
        <Icon icon="mdi:bell-outline" width="20" />
        Notificaciones
        <span
          v-if="tiempoReal.mensajesNoLeidos > 0"
          class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full min-w-4 h-4 flex items-center justify-center px-1"
        >
          {{ tiempoReal.mensajesNoLeidos > 9 ? '9+' : tiempoReal.mensajesNoLeidos }}
        </span>
      </button>

      <button
        type="button"
        class="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
        @click="logout"
      >
        <Icon icon="mdi:logout" width="20" />
        Salir
      </button>
    </nav>

    <!-- Menú: pantallas chicas -->
    <div class="md:hidden relative">
      <button
        type="button"
        class="p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menú de usuario"
        @click="mostrarMenuMovil = !mostrarMenuMovil"
      >
        <Icon icon="mdi:dots-vertical" width="24" />
      </button>

      <!-- Cierra el menú si tocás afuera -->
      <div v-if="mostrarMenuMovil" class="fixed inset-0 z-10" @click="mostrarMenuMovil = false"></div>

      <div
        v-if="mostrarMenuMovil"
        class="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20"
      >
        <span class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700">
          <Icon icon="mdi:account-tag-outline" width="20" />
          {{ rolLabel }}
        </span>

        <router-link
          to="/profile"
          class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          @click="mostrarMenuMovil = false"
        >
          <Icon icon="mdi:account-circle-outline" width="20" />
          Perfil
        </router-link>

        <button
          type="button"
          class="relative w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          @click="toggleNotificaciones"
        >
          <Icon icon="mdi:bell-outline" width="20" />
          Notificaciones
          <span v-if="tiempoReal.mensajesNoLeidos > 0" class="ml-auto bg-red-600 text-white text-[10px] leading-none rounded-full min-w-4 h-4 flex items-center justify-center px-1">
            {{ tiempoReal.mensajesNoLeidos > 9 ? '9+' : tiempoReal.mensajesNoLeidos }}
          </span>
        </button>

        <button
          type="button"
          class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          @click="logout"
        >
          <Icon icon="mdi:logout" width="20" />
          Salir
        </button>
      </div>
    </div>

  </header>

  <!-- Indicador de que el profesor está espectando en vivo, visible en
       cualquier pantalla mientras dure — nada de esto queda activo sin que
       el alumno lo note. -->
  <div v-if="tiempoReal.siendoEspectado" class="bg-red-600 text-white text-xs font-medium text-center py-1 px-2">
    🔴 El profesor está viendo lo que estás cargando
  </div>

  <!-- Panel de notificaciones: se abre con el botón "Notificaciones", de
       escritorio o mobile. Se cierra tocando afuera. Cada mensaje es
       clickeable y abre el chat correspondiente (drawer para el alumno,
       modal para el profesor) en vez de responder ahí mismo. -->
  <div v-if="mostrarNotificaciones" class="fixed inset-0 z-40" @click="mostrarNotificaciones = false"></div>
  <div
    v-if="mostrarNotificaciones"
    class="absolute right-2 top-14 z-50 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-xl border border-gray-100 max-h-96 overflow-y-auto"
  >
    <div class="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-900">
      Notificaciones
    </div>

    <p v-if="cargandoMensajes" class="px-4 py-6 text-sm text-gray-400 text-center">Cargando...</p>

    <p v-else-if="mensajesRecibidos.length === 0" class="px-4 py-6 text-sm text-gray-400 text-center">
      No tenés mensajes todavía.
    </p>

    <div v-else>
      <button
        v-for="mensaje in mensajesRecibidos"
        :key="mensaje.id_mensaje"
        type="button"
        class="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
        :class="!mensaje.leido ? 'bg-green-50/60' : ''"
        @click="abrirChatDesdeNotificacion(mensaje)"
      >
        <p class="text-xs font-medium text-gray-900">
          {{ mensaje.Emisor?.nombre ?? (esAlumno ? 'Profesor' : 'Alumno') }}
        </p>
        <p class="text-sm text-gray-700 mt-0.5 truncate">{{ mensaje.contenido }}</p>
        <p class="text-[11px] text-gray-400 mt-1">{{ formatearFecha(mensaje.createdAt) }}</p>
      </button>
    </div>
  </div>

  <!-- Chat del alumno con el profesor de su sala -->
  <ChatConProfesorDrawer
    v-if="mostrarChatProfesor"
    :nombre-profesor="nombreProfesorChat"
    @cerrar="mostrarChatProfesor = false"
  />

  <!-- Chat del profesor con el alumno que le escribió -->
  <ChatConAlumnoModal
    v-if="chatAlumnoAbierto"
    :id-sala="chatAlumnoAbierto.idSala"
    :id-alumno="chatAlumnoAbierto.idAlumno"
    :nombre-alumno="chatAlumnoAbierto.nombre"
    @cerrar="chatAlumnoAbierto = null"
  />
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { useTiempoRealStore } from '@/stores/useTiempoRealStore'
import { obtenerMensajesRecibidos, type Mensaje } from '@/services/mensajeService'
import ChatConProfesorDrawer from '@/components/ChatconProfesorDrawer.vue'
import ChatConAlumnoModal from '@/components/ChatconAlumnoModal.vue'

defineEmits<{ (e: 'toggle-sidebar'): void }>()

const router = useRouter()
const sesion = useSesionStore()
const seleccion = useSeleccionStore()
const tiempoReal = useTiempoRealStore()

const mostrarMenuMovil = ref(false)

// El rol ya está disponible directo en el store de sesión (idRol),
const NOMBRES_ROL: Record<number, string> = {
  1: 'ADMINISTRADOR',
  2: 'PROFESOR',
  3: 'ALUMNO'
}
const rolLabel = computed(() => NOMBRES_ROL[sesion.idRol] ?? 'Desconocido')
const esAlumno = computed(() => sesion.idRol === 3)

// ---------- Conexión de tiempo real ----------
// El Navbar se remonta en cada vista (no hay un layout compartido), pero
// conectar() es un no-op si ya hay un socket vivo, así que esto no abre
// una conexión nueva por cada navegación.
onMounted(() => {
  if (sesion.token) tiempoReal.conectar()
})

// Cada vez que hay una sala seleccionada (recién logueado, cambio de sala,
// o simplemente porque este Navbar se remontó en otra vista) nos unimos a
// su room. unirseSala() ya es un no-op si es la misma sala de siempre.
watch(() => seleccion.idSala, (idSala) => {
  if (idSala) tiempoReal.unirseSala(idSala)
}, { immediate: true })

const logout = () => {
  tiempoReal.desconectar()
  sesion.cerrarSesion()
  seleccion.reset()
  mostrarMenuMovil.value = false
  router.push('/')
}

// ---------- Notificaciones ----------
const mostrarNotificaciones = ref(false)
const mensajesRecibidos = ref<Mensaje[]>([])
const cargandoMensajes = ref(false)

const toggleNotificaciones = async () => {
  mostrarMenuMovil.value = false
  mostrarNotificaciones.value = !mostrarNotificaciones.value
  if (!mostrarNotificaciones.value) return

  cargandoMensajes.value = true
  try {
    const { data } = await obtenerMensajesRecibidos()
    mensajesRecibidos.value = data?.mensajes ?? []
  } catch (error) {
    console.error('Error al cargar notificaciones:', error)
  } finally {
    cargandoMensajes.value = false
  }

  // Se marcan como leídos al abrir el panel (igual que cualquier bandeja).
  tiempoReal.marcarMensajesLeidos()
}

// ---------- Abrir el chat desde una notificación ----------
// El alumno solo tiene un chat posible (con el profesor de su sala): abre
// el drawer lateral. El profesor puede recibir mensajes de varios alumnos:
// abre el modal de conversación con el alumno puntual que le escribió,
// usando el id_sala del propio mensaje (no seleccion.idSala) por si el
// profesor tiene varias salas y el mensaje es de una distinta a la actual.
const mostrarChatProfesor = ref(false)
const nombreProfesorChat = ref('Profesor')
const chatAlumnoAbierto = ref<{ idSala: number; idAlumno: number; nombre: string } | null>(null)

const abrirChatDesdeNotificacion = (mensaje: Mensaje) => {
  mostrarNotificaciones.value = false

  if (esAlumno.value) {
    nombreProfesorChat.value = mensaje.Emisor?.nombre ?? 'Profesor'
    mostrarChatProfesor.value = true
  } else {
    chatAlumnoAbierto.value = {
      idSala: mensaje.id_sala,
      idAlumno: mensaje.id_emisor,
      nombre: mensaje.Emisor?.nombre ?? 'Alumno'
    }
  }
}

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}
</script>