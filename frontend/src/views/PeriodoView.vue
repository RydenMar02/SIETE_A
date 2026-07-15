<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          <ModalPeriodo
            v-if="mostrarModal"
            :periodo="itemSeleccionado"
            :tituloModal="tituloModal"
            @cerrar="cerrarModal"
            @actualizartabla="getPeriodos"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Períodos</h2>
          </div>

          <!-- Barra de búsqueda y acciones -->
          <div class="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-md border border-gray-200 px-4 py-3 mb-4">
            <div class="flex items-center gap-2 flex-1  min-w-50">
              <i class="ti ti-search text-gray-400 text-lg"></i>
              <input
                v-model="busqueda"
                type="text"
                placeholder="Buscar por período..."
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Nuevo período
            </button>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2">Período</th>
                    <th class="text-center px-3 py-2">Modificar</th>
                    <th class="text-center px-3 py-2">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itemsPaginados" :key="item.id_periodo" class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors">
                    <td class="px-3 py-2">{{ item.periodo }}</td>
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
                  <tr v-if="itemsPaginados.length === 0">
                    <td colspan="3" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación -->
            <div class="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              <span>{{ inicioRango }} - {{ finRango }} / {{ itemsFiltrados.length }}</span>
              <div class="flex gap-1">
                <button type="button" class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40" :disabled="pagina === 1" @click="pagina--">‹</button>
                <button type="button" class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ModalPeriodo from '@/components/PeriodoModal.vue'
import {
  obtenerPeriodos,
  eliminarPeriodo,
  type Periodo
} from '@/services/periodoService'

const { makeToast, makeConfirm } = useAlertas()

// ---------- Datos ----------
const items = ref<Periodo[]>([])

const getPeriodos = async () => {
  try {
    const { data } = await obtenerPeriodos()
    items.value = data ?? []
  } catch (error) {
    manejarError(error, 'No se pudieron cargar los períodos.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
const busqueda = ref('')

const itemsFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => item.periodo.toLowerCase().includes(q))
})

// ---------- Paginación ----------
const TAMANO_PAGINA = 10
const pagina = ref(1)

const totalPaginas = computed(() => Math.max(1, Math.ceil(itemsFiltrados.value.length / TAMANO_PAGINA)))
const itemsPaginados = computed(() => {
  const inicio = (pagina.value - 1) * TAMANO_PAGINA
  return itemsFiltrados.value.slice(inicio, inicio + TAMANO_PAGINA)
})
const inicioRango = computed(() => (itemsFiltrados.value.length === 0 ? 0 : (pagina.value - 1) * TAMANO_PAGINA + 1))
const finRango = computed(() => Math.min(pagina.value * TAMANO_PAGINA, itemsFiltrados.value.length))

watch(busqueda, () => { pagina.value = 1 })

// ---------- Modal ----------
const mostrarModal = ref(false)
const tituloModal = ref('Nuevo Período')
const itemSeleccionado = ref<Periodo | undefined>(undefined)

const abrirModal = () => {
  tituloModal.value = 'Nuevo Período'
  itemSeleccionado.value = undefined
  mostrarModal.value = true
}

const editar = (item: Periodo) => {
  tituloModal.value = 'Modificar Período'
  itemSeleccionado.value = item
  mostrarModal.value = true
}

const cerrarModal = () => {
  itemSeleccionado.value = undefined
  mostrarModal.value = false
}

// ---------- Eliminar ----------
const eliminar = (item: Periodo) => {
  makeConfirm(
    `¿Estás seguro de que deseás eliminar el período: ${item.periodo}?`,
    'No podrás revertir esto. Las empresas asociadas a este período podrían verse afectadas.'
  ).then(async (result) => {
    if (!result.isConfirmed) return
    try {
      await eliminarPeriodo(item.id_periodo)
      items.value = items.value.filter((i) => i.id_periodo !== item.id_periodo)
      makeToast('El período ha sido eliminado.', 'success')
    } catch (error) {
      manejarError(error, 'No se pudo eliminar el período.')
    }
  })
}

onMounted(getPeriodos)
</script>