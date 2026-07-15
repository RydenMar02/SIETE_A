<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <ModalAsiento v-if="mostrarModal" :tituloModal="tituloModal" @cerrar="mostrarModal = false" @actualizartabla="recargarTabla" />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Asiento Contable</h2>
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
                <option value="numero_asiento">N° Asiento</option>
                <option value="sucursal">Sucursal</option>
                <option value="fecha">Fecha</option>
              </select>
            </div>

            <button type="button" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition" @click="generarPdf">
              Reporte de asientos
            </button>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Registrar asiento
            </button>
          </div>

          <!-- Tabla de cabeceras -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2">Ítem</th>
                    <th class="text-left px-3 py-2">Fecha</th>
                    <th class="text-left px-3 py-2">N° Asiento</th>
                    <th class="text-left px-3 py-2">Empresa</th>
                    <th class="text-left px-3 py-2">Sucursal</th>
                    <th class="text-left px-3 py-2">Concepto</th>
                    <th class="text-right px-3 py-2">Total debe</th>
                    <th class="text-right px-3 py-2">Total haber</th>
                    <th class="text-right px-3 py-2">Dif.</th>
                    <th class="text-left px-3 py-2">Tipo</th>
                    <th class="text-center px-3 py-2">Detalle</th>
                    <th class="text-center px-3 py-2">Anular</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in asientosPaginados"
                    :key="item.id_asiento"
                    class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors"
                    :class="{ 'bg-blue-50': asientoSeleccionado?.id_asiento === item.id_asiento }"
                  >
                    <td class="px-3 py-2">{{ item.id_asiento }}</td>
                    <td class="px-3 py-2">{{ item.fecha }}</td>
                    <td class="px-3 py-2">{{ item.numero_asiento }}</td>
                    <td class="px-3 py-2">{{ item.empresa?.nombre }}</td>
                    <td class="px-3 py-2">{{ item.sucursal?.nombre }}</td>
                    <td class="px-3 py-2">{{ item.concepto }}</td>
                    <td class="px-3 py-2 text-right">{{ item.total_debe }}</td>
                    <td class="px-3 py-2 text-right">{{ item.total_haber }}</td>
                    <td class="px-3 py-2 text-right">{{ item.diferencia }}</td>
                    <td class="px-3 py-2">{{ ETIQUETAS_TIPO_ASIENTO[item.tipo_asiento] ?? item.tipo_asiento }}</td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800" @click="verDetalle(item)">
                        <i class="ti ti-list-details text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-red-600 hover:text-red-800" @click="anular(item)">
                        <i class="ti ti-ban text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="asientosPaginados.length === 0">
                    <td colspan="12" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación -->
            <div class="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              <span>{{ inicioRango }} - {{ finRango }} / {{ asientosFiltrados.length }}</span>
              <div class="flex gap-1">
                <button type="button" class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40" :disabled="pagina === 1" @click="pagina--">‹</button>
                <button type="button" class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
              </div>
            </div>
          </div>

          <!-- Tabla de detalle -->
          <div v-if="asientoSeleccionado" class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mt-6">
            <h3 class="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
              Detalle del asiento {{ asientoSeleccionado.numero_asiento }}
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2">N° asiento</th>
                    <th class="text-left px-3 py-2">Código</th>
                    <th class="text-left px-3 py-2">Cuenta</th>
                    <th class="text-right px-3 py-2">Debe</th>
                    <th class="text-right px-3 py-2">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="detalle in itemsDetalle" :key="detalle.id_detalle" class="border-t border-gray-100">
                    <td class="px-3 py-2">{{ asientoSeleccionado?.numero_asiento }}</td>
                    <td class="px-3 py-2">{{ detalle.empresaCuenta.codigo }}</td>
                    <td class="px-3 py-2">{{ detalle.empresaCuenta.nombre }}</td>
                    <td class="px-3 py-2 text-right">{{ detalle.debe }}</td>
                    <td class="px-3 py-2 text-right">{{ detalle.haber }}</td>
                  </tr>
                  <tr v-if="itemsDetalle.length === 0">
                    <td colspan="5" class="text-center text-gray-400 py-6">Este asiento no tiene detalles</td>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ModalAsiento from '@/components/AsientoContableModal.vue'
import {
  obtenerAsientos,
  obtenerDetalleAsiento,
  anularAsiento
} from '@/services/asientoService'
import { abrirReportePdf } from '@/services/reportesService'

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Tipos ----------
interface Empresa { nombre: string }
interface Sucursal { nombre: string }

// tipo_asiento es el ENUM de texto de la tabla ('MANUAL'|'COMPRA'|'VENTA'|'AJUSTE'),
// no un id numérico a otra tabla — coincide con el cambio que hicimos en ModalAsiento.
interface Asiento {
  id_asiento: number
  numero_asiento: string
  fecha: string
  documento: string
  total_debe: number
  total_haber: number
  diferencia: number
  tipo_asiento: string
  empresa?: Empresa
  sucursal?: Sucursal
  concepto: string
}

// El campo real de la cuenta es id_empresacuenta (confirmado por la respuesta
// del backend), no idempresa_cuenta.
interface EmpresaCuenta {
  id_empresacuenta: number
  codigo: string
  nombre: string
  naturaleza: string
  asentable: string
}

// El backend anida el detalle como "empresaCuenta" (C mayúscula), y no manda
// un "asientoCabecera" por cada renglón — el número de asiento solo vive una
// vez, en la cabecera (asientoSeleccionado), no repetido en cada detalle.
interface AsientoDetalle {
  id_detalle: number
  debe: number
  haber: number
  empresaCuenta: EmpresaCuenta
}

const ETIQUETAS_TIPO_ASIENTO: Record<string, string> = {
  MANUAL: 'Manual',
  COMPRA: 'Compra',
  VENTA: 'Venta',
  AJUSTE: 'Ajuste'
}

// ---------- Datos ----------
const items = ref<Asiento[]>([])
const itemsDetalle = ref<AsientoDetalle[]>([])
const asientoSeleccionado = ref<Asiento | null>(null)

const cargarAsientos = async () => {
  try {
    const { data } = await obtenerAsientos(seleccion.idEmpresa)
    items.value = data.asientos ?? []
  } catch (error) {
    manejarError(error, 'No se pudo traer los datos del asiento.')
  }
}

const verDetalle = async (item: Asiento) => {
  asientoSeleccionado.value = item
  try {
    // La respuesta es el asiento completo, con el detalle anidado bajo
    // "asientoDetalles" — antes se buscaba "detalles", que no existe.
    const { data } = await obtenerDetalleAsiento(item.id_asiento)
    itemsDetalle.value = data.asientoDetalles ?? []
  } catch (error) {
    manejarError(error, 'No se pudo traer los datos del detalle del asiento.')
  }
}

const anular = async (item: Asiento) => {
  const confirmacion = await makeConfirm(
    '¿Está seguro?',
    'Esta acción anulará el asiento.'
  )
  if (!confirmacion.isConfirmed) return

  try {
    await anularAsiento(item.id_asiento)
    makeToast('Se anuló correctamente.', 'success')
    if (asientoSeleccionado.value?.id_asiento === item.id_asiento) {
      asientoSeleccionado.value = null
      itemsDetalle.value = []
    }
    cargarAsientos()
  } catch (error) {
    manejarError(error, 'No se pudo anular el asiento.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
type Filtro = 'numero_asiento' | 'sucursal' | 'fecha'
const ETIQUETAS_FILTRO: Record<Filtro, string> = { numero_asiento: 'N° asiento', sucursal: 'sucursal', fecha: 'fecha' }

const busqueda = ref('')
const columnaFiltro = ref<Filtro>('numero_asiento')

const asientosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => {
    const valor = columnaFiltro.value === 'sucursal'
      ? item.sucursal?.nombre ?? ''
      : String(item[columnaFiltro.value] ?? '')
    return valor.toLowerCase().includes(q)
  })
})

// ---------- Paginación ----------
const TAMANO_PAGINA = 10
const pagina = ref(1)

const totalPaginas = computed(() => Math.max(1, Math.ceil(asientosFiltrados.value.length / TAMANO_PAGINA)))
const asientosPaginados = computed(() => {
  const inicio = (pagina.value - 1) * TAMANO_PAGINA
  return asientosFiltrados.value.slice(inicio, inicio + TAMANO_PAGINA)
})
const inicioRango = computed(() => (asientosFiltrados.value.length === 0 ? 0 : (pagina.value - 1) * TAMANO_PAGINA + 1))
const finRango = computed(() => Math.min(pagina.value * TAMANO_PAGINA, asientosFiltrados.value.length))

watch(busqueda, () => { pagina.value = 1 })
watch(columnaFiltro, () => { pagina.value = 1 })

// ---------- Modal de registrar asiento ----------
const mostrarModal = ref(false)
const tituloModal = ref('Registrar Asiento')

const abrirModal = () => {
  tituloModal.value = 'Registrar Asiento'
  mostrarModal.value = true
}

const recargarTabla = () => cargarAsientos()

// ---------- Reporte PDF ----------
const generarPdf = async () => {
  if (!seleccion.idEmpresa) {
    makeToast('No se encontró la empresa logueada.', 'warning')
    return
  }
  try {
    await abrirReportePdf('asientos', seleccion.idEmpresa)
  } catch (error) {
    console.error('Error al generar el PDF de asientos:', error)
    makeToast('No se pudo generar el PDF de asientos.', 'error')
  }
}

onMounted(cargarAsientos)
</script>