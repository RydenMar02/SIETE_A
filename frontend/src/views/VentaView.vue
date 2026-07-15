<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">

          <CompraVentaModal
            v-if="mostrarModal"
            tipo="VENTA"
            :tituloModal="tituloModal"
            :itemEditar="ventaSeleccionada"
            @cerrar="cerrarModal"
            @actualizartabla="obtenerVentas"
          />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Registrar Venta</h2>
          </div>

          <!-- Barra de búsqueda y acciones -->
          <div class="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-md border border-gray-200 px-4 py-3 mb-4">
            <div class="flex items-center gap-2 flex-1 min-w-[240px]">
              <i class="ti ti-search text-gray-400 text-lg"></i>
              <input
                v-model="busqueda"
                type="text"
                :placeholder="`Buscar por ${ETIQUETAS_FILTRO[columnaFiltro]}...`"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select v-model="columnaFiltro" class="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="nombre_sucursal">Sucursal</option>
                <option value="numero_identificacion">Cliente RUC</option>
                <option value="numero_factura">N° Factura</option>
                <option value="forma_pago">Forma de pago</option>
              </select>
            </div>

            <button type="button" class="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition" @click="generarPdf">
              Reportes ventas
            </button>

            <button type="button" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1" @click="abrirModal">
              <i class="ti ti-plus"></i>
              Registrar venta
            </button>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Sucursal</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Fecha</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Cliente RUC</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Razón social</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Tipo factura</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">N° factura</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Importe</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Moneda</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Forma de pago</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">N° timbrado</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Exentas</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Gravadas 10%</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Gravadas 5%</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Base imp. 10%</th>
                    <th class="text-right px-3 py-2 whitespace-nowrap">Base imp. 5%</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Cuenta exenta</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Cuenta grav. 10%</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Cuenta grav. 5%</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Concepto</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Imputada</th>
                    <th class="text-center px-3 py-2">Modificar</th>
                    <th class="text-center px-3 py-2">Anular</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in itemsPaginados" :key="item.id_venta" class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors">
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.nombre_sucursal }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.fecha }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.numero_identificacion }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.razon_social }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.tipo_factura }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.numero_factura }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.total_factura }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.moneda }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.forma_pago }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.numero_timbrado }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.monto_exentas }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.gravadas_10 }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.gravadas_05 }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.baseimp_10 }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{{ item.baseimp_05 }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.nombre_cuenta_exenta }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.nombre_cuenta_grav10 }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.nombre_cuenta_grav05 }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.concepto }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ item.imputada }}</td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-blue-600 hover:text-blue-800" @click="editarVenta(item)">
                        <i class="ti ti-pencil text-lg"></i>
                      </button>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button type="button" class="text-red-600 hover:text-red-800" @click="anularVenta(item)">
                        <i class="ti ti-ban text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="itemsPaginados.length === 0">
                    <td colspan="21" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
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
import CompraVentaModal from '@/components/CompraVentaModal.vue'
import {
  obtenerComprasVentas,
  anularCompraVenta
} from '@/services/compraVentaService'
import { abrirReportePdf } from '@/services/reportesService'
const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Tipos ----------
interface Cuenta { nombre: string }

interface VentaApi {
  idcompra_venta: number
  tipo_de_factura: string
  numero_factura: string
  numero_timbrado: number
  fecha: string
  condicion: string
  total_factura: number
  moneda: string
  exenta: number
  gravada10: number
  gravada05: number
  base_imp_iva_10: number
  base_imp_iva_05: number
  cuenta_exenta: number
  cuenta_grav10: number
  cuenta_grav05: number
  concepto: string
  imputada: 'SI' | 'NO'
  ClienteProveedor?: { razon_social: string; numero_identificacion: string }
  Sucursal?: { nombre: string }
  cuentaExenta?: Cuenta
  cuentaGrav10?: Cuenta
  cuentaGrav05?: Cuenta
}

interface VentaListado {
  id_venta: number
  nombre_sucursal: string
  fecha: string
  numero_identificacion: string
  razon_social: string
  tipo_factura: string
  numero_factura: string
  total_factura: number
  moneda: string
  forma_pago: string
  numero_timbrado: number
  monto_exentas: number
  gravadas_10: number
  gravadas_05: number
  baseimp_10: number
  baseimp_05: number
  nombre_cuenta_exenta: string
  nombre_cuenta_grav10: string
  nombre_cuenta_grav05: string
  concepto: string
  imputada: string
}

// ---------- Datos ----------
const ventasApi = ref<VentaApi[]>([])
const items = ref<VentaListado[]>([])

const obtenerVentas = async () => {
  try {
    const { data } = await obtenerComprasVentas('VENTA', seleccion.idEmpresa)
    ventasApi.value = data.registros ?? []
    items.value = ventasApi.value.map((v) => ({
      id_venta: v.idcompra_venta,
      nombre_sucursal: v.Sucursal?.nombre ?? '',
      fecha: v.fecha,
      numero_identificacion: v.ClienteProveedor?.numero_identificacion ?? '',
      razon_social: v.ClienteProveedor?.razon_social ?? '',
      tipo_factura: v.tipo_de_factura,
      numero_factura: v.numero_factura,
      total_factura: v.total_factura,
      moneda: v.moneda,
      forma_pago: v.condicion,
      numero_timbrado: v.numero_timbrado,
      monto_exentas: v.exenta,
      gravadas_10: v.gravada10,
      gravadas_05: v.gravada05,
      baseimp_10: v.base_imp_iva_10,
      baseimp_05: v.base_imp_iva_05,
      nombre_cuenta_exenta: v.cuentaExenta?.nombre ?? '',
      nombre_cuenta_grav10: v.cuentaGrav10?.nombre ?? '',
      nombre_cuenta_grav05: v.cuentaGrav05?.nombre ?? '',
      concepto: v.concepto,
      imputada: v.imputada
    }))
  } catch (error) {
    manejarError(error, 'No se pudieron cargar las ventas.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Búsqueda ----------
type Filtro = 'nombre_sucursal' | 'numero_identificacion' | 'numero_factura' | 'forma_pago'
const ETIQUETAS_FILTRO: Record<Filtro, string> = {
  nombre_sucursal: 'sucursal',
  numero_identificacion: 'RUC del cliente',
  numero_factura: 'N° de factura',
  forma_pago: 'forma de pago'
}

const busqueda = ref('')
const columnaFiltro = ref<Filtro>('nombre_sucursal')

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
const tituloModal = ref('Registrar Venta')
const ventaSeleccionada = ref<VentaApi | null>(null)

const abrirModal = () => {
  tituloModal.value = 'Registrar Venta'
  // Mismo bug que en CompraView: la versión original declaraba una
  // `const ventaSeleccionada = ref(null)` LOCAL acá adentro, que tapaba a la
  // de afuera y se perdía al instante. La de afuera nunca se reseteaba.
  ventaSeleccionada.value = null
  mostrarModal.value = true
}

const editarVenta = (item: VentaListado) => {
  const original = ventasApi.value.find((v) => v.idcompra_venta === item.id_venta)
  if (!original) {
    makeToast('No se encontró la venta original.', 'error')
    return
  }
  tituloModal.value = 'Modificar Venta'
  ventaSeleccionada.value = original
  mostrarModal.value = true
}

const cerrarModal = () => {
  ventaSeleccionada.value = null
  mostrarModal.value = false
}

// ---------- Anular ----------
const anularVenta = (item: VentaListado) => {
  makeConfirm('¿Está seguro?', 'Esta acción anulará la venta.').then(async (result) => {
    if (!result.isConfirmed) return
    try {
      await anularCompraVenta(item.id_venta)
      makeToast('Se anuló correctamente.', 'success')
      obtenerVentas()
    } catch (error) {
      manejarError(error, 'No se pudo anular la venta.')
    }
  })
}

// ---------- Reporte PDF ----------

const generarPdf = async () => {
  if (!seleccion.idEmpresa) {
    makeToast('No se encontró la empresa logueada.', 'warning')
    return
  }
  try {
    await abrirReportePdf('ventas', seleccion.idEmpresa)
  } catch (error) {
    console.error('Error al generar el PDF de ventas:', error)
    makeToast('No se pudo generar el PDF de ventas.', 'error')
  }
}
onMounted(obtenerVentas)
</script>