<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-gray-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <ModalSucursal
            v-if="mostrarModal"
            :sucursal="itemSeleccionado"
            :tituloModal="tituloModal"
            :subtituloModal="subtituloModal"
            @cerrar="cerrarModal"
            @actualizartabla="getSucursales"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Sucursales</h2>
          </div>

          <!-- Barra de búsqueda y acciones -->
          <div class="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3 mb-4">
            <div class="flex items-center gap-2 flex-1 min-w-[240px]">
              <i class="ti ti-search text-gray-400 text-lg"></i>
              <input
                v-model="busqueda"
                type="text"
                :placeholder="`Buscar por ${ETIQUETAS_FILTRO[columnaFiltro]}...`"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select v-model="columnaFiltro" class="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="nombre">Sucursal</option>
                <option value="nombre_empresa">Empresa</option>
              </select>
            </div>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Cargar nueva sucursal
            </button>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 text-gray-700">
                  <tr>
                    <th class="text-left px-3 py-2">Código</th>
                    <th class="text-left px-3 py-2">Sucursal</th>
                    <th class="text-left px-3 py-2">Empresa</th>
                    <th class="text-left px-3 py-2">Teléfono</th>
                    <th class="text-left px-3 py-2">Responsable</th>
                    <th class="text-center px-3 py-2">Modificar</th>
                    <th class="text-center px-3 py-2">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itemsPaginados" :key="item.id_sucursal" class="border-t border-gray-100">
                    <td class="px-3 py-2">{{ item.codigo }}</td>
                    <td class="px-3 py-2">{{ item.nombre }}</td>
                    <td class="px-3 py-2">{{ item.nombre_empresa }}</td>
                    <td class="px-3 py-2">{{ item.telefono }}</td>
                    <td class="px-3 py-2">{{ item.responsable }}</td>
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
                    <td colspan="7" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
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
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ModalSucursal from '@/components/SucursalesModal.vue'
import {
  obtenerSucursales,
  eliminarSucursal,
  type SucursalDetalle
} from '@/services/sucursalService'

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Datos ----------
const items = ref<SucursalDetalle[]>([])

const getSucursales = async () => {
  try {
    const { data } = await obtenerSucursales(seleccion.idEmpresa)
    items.value = (data.sucursales ?? []).map((s: any) => ({
      ...s,
      nombre_empresa: s.Empresa?.nombre ?? 'Desconocido'
    }))
  } catch (error) {
    manejarError(error, 'No existen sucursales para esta empresa, creá una.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
type Filtro = 'nombre' | 'nombre_empresa'
const ETIQUETAS_FILTRO: Record<Filtro, string> = { nombre: 'sucursal', nombre_empresa: 'empresa' }

const busqueda = ref('')
const columnaFiltro = ref<Filtro>('nombre')

const itemsFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => String(item[columnaFiltro.value] ?? '').toLowerCase().includes(q))
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
watch(columnaFiltro, () => { pagina.value = 1 })

// ---------- Modal ----------
const mostrarModal = ref(false)
const tituloModal = ref('Cargar Nueva Sucursal')
const subtituloModal = ref('Ingrese todos los datos de la nueva sucursal')
const itemSeleccionado = ref<SucursalDetalle | undefined>(undefined)

const abrirModal = () => {
  tituloModal.value = 'Cargar Nueva Sucursal'
  subtituloModal.value = 'Ingrese todos los datos de la sucursal'
  itemSeleccionado.value = undefined
  mostrarModal.value = true
}

const editar = (item: SucursalDetalle) => {
  tituloModal.value = 'Modificar Sucursal'
  subtituloModal.value = 'Edite los datos de la Sucursal'
  itemSeleccionado.value = item
  mostrarModal.value = true
}

const cerrarModal = () => {
  itemSeleccionado.value = undefined
  mostrarModal.value = false
}

// ---------- Eliminar ----------
const eliminar = (item: SucursalDetalle) => {
  makeConfirm(
    `¿Estás seguro de que deseás eliminar la sucursal: ${item.nombre}?`,
    'No podrás revertir esto.'
  ).then(async (result) => {
    if (!result.isConfirmed) return
    try {
      await eliminarSucursal(item.id_sucursal)
      items.value = items.value.filter((i) => i.id_sucursal !== item.id_sucursal)
      makeToast('La sucursal ha sido eliminada.', 'success')
    } catch (error) {
      manejarError(error, 'No se pudo eliminar la sucursal.')
    }
  })
}

onMounted(getSucursales)
</script>