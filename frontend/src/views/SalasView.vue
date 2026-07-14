<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-gray-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <ModalCrear
            v-if="mostrarModal"
            :sala="itemSeleccionado"
            :mostrarIngresar="false"
            :tituloModal="tituloModal"
            @cerrar="cerrarModal"
            @actualizartabla="getDatos"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Crear Sala de Estudio</h2>
          </div>

          <!-- Barra de acciones -->
          <div class="flex flex-wrap items-center gap-2 bg-white rounded-xl shadow-sm px-4 py-3 mb-4">
            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Crear sala
            </button>

            <button type="button" class="bg-white border border-green-600 text-green-700 hover:bg-green-50 text-sm font-medium px-4 py-2 rounded-lg transition" @click="mostrarDivSalas">
              Ver salas
            </button>

            <button type="button" class="bg-white border border-amber-500 text-amber-600 hover:bg-amber-50 text-sm font-medium px-4 py-2 rounded-lg transition" @click="mostrarDivAlumnos">
              Lista de alumnos
            </button>

            <button type="button" class="bg-white border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg transition" disabled title="Próximamente">
              Ver tareas enviadas
            </button>
          </div>

          <!-- Tabla de salas -->
          <div v-show="mostrarSalas" class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 text-gray-700">
                  <tr>
                    <th class="text-left px-3 py-2">Ítem</th>
                    <th class="text-left px-3 py-2">Sala</th>
                    <th class="text-left px-3 py-2">Contraseña</th>
                    <th class="text-left px-3 py-2">Cantidad alumnos</th>
                    <th class="text-center px-3 py-2">Ver alumnos</th>
                    <th class="text-center px-3 py-2">Modificar</th>
                    <th class="text-center px-3 py-2">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in items" :key="item.id_sala" class="border-t border-gray-100">
                    <td class="px-3 py-2">{{ item.id_sala }}</td>
                    <td class="px-3 py-2">{{ item.sala }}</td>
                    <td class="px-3 py-2">{{ item.contra }}</td>
                    <td class="px-3 py-2">{{ item.totalalumnos }}</td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800" @click="verAlumnos(item)">
                        <i class="ti ti-eye text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800" @click="editar(item)">
                        <i class="ti ti-pencil text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-red-600 hover:text-red-800" @click="eliminar(item)">
                        <i class="ti ti-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="items.length === 0">
                    <td colspan="7" class="text-center text-gray-400 py-6">Todavía no creaste ninguna sala</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tabla de alumnos -->
          <div v-show="!mostrarSalas" class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 text-gray-700">
                  <tr>
                    <th class="text-left px-3 py-2">Ítem</th>
                    <th class="text-left px-3 py-2">Alumno</th>
                    <th class="text-left px-3 py-2">Cédula</th>
                    <th class="text-left px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itemsAlumnos" :key="item.id_usuario" class="border-t border-gray-100">
                    <td class="px-3 py-2">{{ item.id_usuario }}</td>
                    <td class="px-3 py-2">{{ item.nombre }}</td>
                    <td class="px-3 py-2">{{ item.cedula }}</td>
                    <td class="px-3 py-2">{{ item.estado }}</td>
                  </tr>
                  <tr v-if="itemsAlumnos.length === 0">
                    <td colspan="4" class="text-center text-gray-400 py-6">Elegí "Ver alumnos" en una sala para ver su lista aquí</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ModalCrear from '@/components/SalaModal.vue'
import {
  obtenerSalasDeUsuario,
  obtenerAlumnosDeSala,
  eliminarSala
} from '@/services/salaService'

const { makeToast, makeConfirm } = useAlertas()
const sesion = useSesionStore()

// ---------- Alternar entre tabla de salas y de alumnos ----------
const mostrarSalas = ref(true)
const mostrarDivSalas = () => { mostrarSalas.value = true }
const mostrarDivAlumnos = () => { mostrarSalas.value = false }

// ---------- Tipos ----------
interface Sala {
  id_sala: number
  sala: string
  contra: string
  nombre: string
  totalalumnos?: number
}

interface Alumno {
  id_usuario: number
  nombre: string
  cedula: string
  estado: string
}

// ---------- Datos ----------
const items = ref<Sala[]>([])

const getDatos = async () => {
  try {
    const { data } = await obtenerSalasDeUsuario(sesion.idUsuario)
    items.value = (data.salas ?? []).map((sala: any) => ({
      id_sala: sala.id_sala,
      sala: sala.sala,
      contra: sala.contra,
      nombre: sesion.nombre,
      totalalumnos: sala.cantidad_alumno
    }))
  } catch (error) {
    manejarError(error, 'No se pudo cargar los datos de la sala.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Modal ----------
const mostrarModal = ref(false)
const tituloModal = ref('Crear Sala')
const itemSeleccionado = ref<Sala | undefined>(undefined)

const abrirModal = () => {
  tituloModal.value = 'Crear Sala'
  itemSeleccionado.value = undefined
  mostrarModal.value = true
}

const editar = (item: Sala) => {
  tituloModal.value = 'Modificar Sala'
  itemSeleccionado.value = item
  mostrarModal.value = true
}

const cerrarModal = () => {
  itemSeleccionado.value = undefined
  mostrarModal.value = false
}

// ---------- Ver alumnos de una sala ----------
const itemsAlumnos = ref<Alumno[]>([])

const verAlumnos = async (item: Sala) => {
  mostrarDivAlumnos()
  try {
    const { data } = await obtenerAlumnosDeSala(item.id_sala, sesion.idUsuario)
    itemsAlumnos.value = data.alumnos ?? []
  } catch (error) {
    manejarError(error, 'No se pudo cargar los datos de los alumnos.')
  }
}

// ---------- Eliminar ----------
const eliminar = (item: Sala) => {
  makeConfirm(
    `¿Estás seguro de que deseás eliminar la sala: ${item.sala}?`,
    'No podrás revertir esto.'
  ).then(async (result) => {
    if (!result.isConfirmed) return
    try {
      await eliminarSala(item.id_sala)
      items.value = items.value.filter((i) => i.id_sala !== item.id_sala)
      makeToast('La sala ha sido eliminada.', 'success')
    } catch (error) {
      manejarError(error, 'No se pudo eliminar la sala.')
    }
  })
}

onMounted(getDatos)
</script>