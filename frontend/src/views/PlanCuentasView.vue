<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <ModalAccount
            v-if="mostrarModal"
            :cuenta="itemSeleccionado"
            :tituloModal="tituloModal"
            :subtituloModal="subtituloModal"
            @cerrar="cerrarModal"
            @actualizartabla="getAccounts"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Cuentas</h2>
          </div>

          <!-- Barra de búsqueda y acciones -->
          <div class="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-md border border-gray-200 px-4 py-3 mb-4">
            <div class="flex items-center gap-2 flex-1  min-w-50">
              <i class="ti ti-search text-gray-400 text-lg"></i>
              <input
                v-model="busqueda"
                type="text"
                :placeholder="`Buscar por ${ETIQUETAS_FILTRO[columnaFiltro]}...`"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select v-model="columnaFiltro" class="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="codigo">Código</option>
                <option value="nombre">Nombre</option>
                <option value="nivel">Nivel</option>
                <option value="naturaleza">Naturaleza</option>
              </select>
            </div>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Crear nueva cuenta
            </button>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto max-h-[65vh] overflow-y-auto">
              <table class="w-full text-sm border-separate border-spacing-0">
                <thead class="sticky top-0 z-10 bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2.5 font-semibold">Código</th>
                    <th class="text-left px-3 py-2.5 font-semibold">Nombre</th>
                    <th class="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Nombre alternativo</th>
                    <th class="text-center px-3 py-2.5 font-semibold">Nivel</th>
                    <th class="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Naturaleza</th>
                    <th class="text-center px-3 py-2.5 font-semibold hidden sm:table-cell">Asentable</th>
                    <th class="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Moneda</th>
                    <th class="text-center px-3 py-2.5 font-semibold">Modificar</th>
                    <th class="text-center px-3 py-2.5 font-semibold">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in itemsFiltrados"
                    :key="item.id_empresacuenta"
                    class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors"
                  >
                    <td
                      class="px-3 py-2 whitespace-nowrap font-mono tabular-nums"
                      :class="item.nivelIndentado === 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'"
                    >
                      {{ item.codigo }}
                    </td>

                    <!-- Nombre: peso e indentación distintos por nivel, con guía vertical -->
                    <td class="px-3 py-2">
                      <div class="flex items-center relative" :style="{ paddingLeft: `${item.nivelIndentado * 22}px` }">
                        <span
                          v-if="item.nivelIndentado > 0"
                          class="absolute border-l-2 border-gray-200"
                          :style="{ left: `${(item.nivelIndentado - 1) * 22 + 8}px`, top: '-9px', bottom: '9px' }"
                        ></span>
                        <i
                          v-if="item.nivelIndentado > 0"
                          class="ti ti-corner-down-right text-gray-300 mr-1.5 shrink-0"
                        ></i>
                        <span
                          :class="[
                            item.nivelIndentado === 0 ? 'text-gray-900 font-bold uppercase tracking-wide text-[13px]' : '',
                            item.nivelIndentado === 1 ? 'text-slate-700 font-semibold' : '',
                            item.nivelIndentado >= 2 ? 'text-gray-500 font-normal' : ''
                          ]"
                        >
                          {{ item.nombre }}
                        </span>
                      </div>
                    </td>

                    <td class="px-3 py-2 text-gray-500 hidden md:table-cell">{{ item.nombre_alternativo }}</td>

                    <td class="px-3 py-2 text-center">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {{ item.nivel }}
                      </span>
                    </td>

                    <td class="px-3 py-2 hidden sm:table-cell">
                      <span
                        class="text-xs font-medium px-2 py-0.5 rounded-full"
                        :class="item.naturaleza === 'DEUDORA' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'"
                      >
                        {{ item.naturaleza }}
                      </span>
                    </td>

                    <td class="px-3 py-2 text-center hidden sm:table-cell">
                      <i v-if="item.asentable === 'SI'" class="ti ti-check text-green-600 text-lg"></i>
                      <i v-else class="ti ti-minus text-gray-300 text-lg"></i>
                    </td>

                    <td class="px-3 py-2 text-gray-500 hidden lg:table-cell">{{ item.moneda }}</td>

                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded p-1 transition-colors" @click="editar(item)">
                        <i class="ti ti-pencil text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1 transition-colors" @click="eliminar(item)">
                        <i class="ti ti-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="itemsFiltrados.length === 0">
                    <td colspan="9" class="text-center text-gray-400 py-8">No se encontraron resultados</td>
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
import { ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { aplanarCuentas } from '@/composables/useCuentasArbol'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ModalAccount from '@/components/CuentaModal.vue'
import {
  obtenerEstructuraCuentas,
  eliminarCuentaEmpresa,
  type CuentaAplanada
} from '@/services/cuentaService'

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Datos ----------
const items = ref<CuentaAplanada[]>([])

const getAccounts = async () => {
  try {
    const { data } = await obtenerEstructuraCuentas(seleccion.idEmpresa)
    items.value = aplanarCuentas(data)
  } catch (error) {
    manejarError(error, 'No se pudo cargar las cuentas.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.message ?? data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
type Filtro = 'codigo' | 'nombre' | 'nivel' | 'naturaleza'
const ETIQUETAS_FILTRO: Record<Filtro, string> = {
  codigo: 'código',
  nombre: 'nombre',
  nivel: 'nivel',
  naturaleza: 'naturaleza'
}

const busqueda = ref('')
const columnaFiltro = ref<Filtro>('codigo')

// Esta tabla no pagina (a diferencia de las otras vistas): el plan de
// cuentas necesita verse como árbol completo para que la indentación tenga
// sentido, así que solo se filtra, con scroll interno en vez de páginas.
const itemsFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => String(item[columnaFiltro.value] ?? '').toLowerCase().includes(q))
})

// ---------- Modal ----------
const mostrarModal = ref(false)
const tituloModal = ref('Cargar Nueva Cuenta')
const subtituloModal = ref('Ingrese todos los datos de la Cuenta')
const itemSeleccionado = ref<CuentaAplanada | undefined>(undefined)

const abrirModal = () => {
  tituloModal.value = 'Cargar Nueva Cuenta'
  subtituloModal.value = 'Ingrese todos los datos de la Cuenta'
  itemSeleccionado.value = undefined
  mostrarModal.value = true
}

const editar = (item: CuentaAplanada) => {
  tituloModal.value = 'Modificar Cuenta'
  subtituloModal.value = 'Edite los datos de la cuenta'
  itemSeleccionado.value = item
  mostrarModal.value = true
}

const cerrarModal = () => {
  itemSeleccionado.value = undefined
  mostrarModal.value = false
}

// ---------- Eliminar ----------
const eliminar = (item: CuentaAplanada) => {
  makeConfirm(
    `¿Estás seguro de que deseás eliminar la cuenta: ${item.nombre}?`,
    'No podrás revertir esto.'
  ).then(async (result) => {
    if (!result.isConfirmed) return
    try {
      await eliminarCuentaEmpresa(item.id_empresacuenta)
      items.value = items.value.filter((i) => i.id_empresacuenta !== item.id_empresacuenta)
      makeToast('La cuenta ha sido eliminada.', 'success')
    } catch (error) {
      manejarError(error, 'No se pudo eliminar la cuenta.')
    }
  })
}

onMounted(getAccounts)
</script>