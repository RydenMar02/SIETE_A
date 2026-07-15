<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <ClienteProveedorModal
            v-if="mostrarModal"
            tipo="PROVEEDOR"
            :tituloModal="tituloModal"
            :itemEditar="proveedorSeleccionado"
            @cerrar="cerrarModal"
            @actualizartabla="obtenerProveedores"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Gestión de Proveedores</h2>
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
                <option value="numero_identificacion">CI/RUC</option>
                <option value="razon_social">Razón social</option>
                <option value="tipo_contribuyente">Contribuyente</option>
              </select>
            </div>

            <button type="button" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition" @click="generarPdf">
              Listado de proveedores
            </button>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Registrar proveedor
            </button>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2">Tipo documento</th>
                    <th class="text-left px-3 py-2">N° identificación</th>
                    <th class="text-left px-3 py-2">Contribuyente</th>
                    <th class="text-left px-3 py-2">Razón social</th>
                    <th class="text-left px-3 py-2">Dirección</th>
                    <th class="text-left px-3 py-2">Ciudad</th>
                    <th class="text-left px-3 py-2">Teléfono</th>
                    <th class="text-left px-3 py-2">Correo</th>
                    <th class="text-left px-3 py-2">Empresa</th>
                    <th class="text-center px-3 py-2">Modificar</th>
                    <th class="text-center px-3 py-2">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in proveedoresPaginados" :key="item.id_clienteproveedor" class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors">
                    <td class="px-3 py-2">{{ ETIQUETAS_TIPO_DOCUMENTO[item.tipo_documento] }}</td>
                    <td class="px-3 py-2">{{ item.numero_identificacion }}</td>
                    <td class="px-3 py-2">{{ ETIQUETAS_TIPO_CONTRIBUYENTE[item.tipo_contribuyente] }}</td>
                    <td class="px-3 py-2">{{ item.razon_social }}</td>
                    <td class="px-3 py-2">{{ item.direccion }}</td>
                    <td class="px-3 py-2">{{ item.Ciudad?.nombre }}</td>
                    <td class="px-3 py-2">{{ item.telefono }}</td>
                    <td class="px-3 py-2">{{ item.correo }}</td>
                    <td class="px-3 py-2">{{ item.Empresa?.nombre }}</td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800" @click="editarProveedor(item)">
                        <i class="ti ti-pencil text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-red-600 hover:text-red-800" @click="eliminarProveedor(item)">
                        <i class="ti ti-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="proveedoresPaginados.length === 0">
                    <td colspan="13" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación -->
            <div class="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              <span>{{ inicioRango }} - {{ finRango }} / {{ proveedoresFiltrados.length }}</span>
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
import ClienteProveedorModal from '@/components/ClienteProveedorModal.vue'
import { ETIQUETAS_TIPO_DOCUMENTO, ETIQUETAS_TIPO_CONTRIBUYENTE } from '@/services/catalogoService'
import {
  obtenerClientesProveedores,
  eliminarClienteProveedor,
  type ClienteProveedorDetalle
} from '@/services/clienteProveedorService'
import { abrirReportePdf } from '@/services/reportesService'
const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Datos ----------
const proveedores = ref<ClienteProveedorDetalle[]>([])

const obtenerProveedores = async () => {
  try {
    const { data } = await obtenerClientesProveedores('PROVEEDOR', seleccion.idEmpresa)
    proveedores.value = data.registros ?? []
  } catch (error) {
    manejarError(error, 'No se pudieron cargar los proveedores.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
type Filtro = 'numero_identificacion' | 'razon_social' | 'tipo_contribuyente'
const ETIQUETAS_FILTRO: Record<Filtro, string> = {
  numero_identificacion: 'CI/RUC',
  razon_social: 'razón social',
  tipo_contribuyente: 'contribuyente'
}

const busqueda = ref('')
const columnaFiltro = ref<Filtro>('numero_identificacion')

const proveedoresFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return proveedores.value
  return proveedores.value.filter((p) => {
    const valor = columnaFiltro.value === 'tipo_contribuyente'
      ? ETIQUETAS_TIPO_CONTRIBUYENTE[p.tipo_contribuyente]
      : p[columnaFiltro.value]
    return String(valor ?? '').toLowerCase().includes(q)
  })
})

// ---------- Paginación ----------
const TAMANO_PAGINA = 10
const pagina = ref(1)

const totalPaginas = computed(() => Math.max(1, Math.ceil(proveedoresFiltrados.value.length / TAMANO_PAGINA)))
const proveedoresPaginados = computed(() => {
  const inicio = (pagina.value - 1) * TAMANO_PAGINA
  return proveedoresFiltrados.value.slice(inicio, inicio + TAMANO_PAGINA)
})
const inicioRango = computed(() => (proveedoresFiltrados.value.length === 0 ? 0 : (pagina.value - 1) * TAMANO_PAGINA + 1))
const finRango = computed(() => Math.min(pagina.value * TAMANO_PAGINA, proveedoresFiltrados.value.length))

watch(busqueda, () => { pagina.value = 1 })
watch(columnaFiltro, () => { pagina.value = 1 })

// ---------- Modal ----------
const mostrarModal = ref(false)
const tituloModal = ref('Registrar Proveedor')
const proveedorSeleccionado = ref<ClienteProveedorDetalle | null>(null)

const abrirModal = () => {
  tituloModal.value = 'Registrar Proveedor'
  proveedorSeleccionado.value = null
  mostrarModal.value = true
}

const editarProveedor = (item: ClienteProveedorDetalle) => {
  tituloModal.value = 'Modificar Proveedor'
  proveedorSeleccionado.value = item
  mostrarModal.value = true
}

const cerrarModal = () => {
  proveedorSeleccionado.value = null
  mostrarModal.value = false
}

// ---------- Eliminar ----------
const eliminarProveedor = async (item: ClienteProveedorDetalle) => {
  const confirmacion = await makeConfirm(
    '¿Está seguro?',
    `Esta acción eliminará al proveedor: ${item.razon_social}`
  )
  if (!confirmacion.isConfirmed) return

  try {
    await eliminarClienteProveedor(item.id_clienteproveedor)
    makeToast('Se eliminó correctamente.', 'success')
    obtenerProveedores()
  } catch (error) {
    manejarError(error, 'No se pudo eliminar el proveedor.')
  }
}

// ---------- Reporte PDF ----------

const generarPdf = async () => {
  if (!seleccion.idEmpresa) {
    makeToast('No se encontró la empresa logueada.', 'warning')
    return
  }
  try {
    await abrirReportePdf('proveedores', seleccion.idEmpresa)
  } catch (error) {
    console.error('Error al generar el PDF de proveedores:', error)
    makeToast('No se pudo generar el PDF de proveedores.', 'error')
  }
}

onMounted(obtenerProveedores)
</script>