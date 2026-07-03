<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-gray-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        <!-- Bienvenida -->
        <div class="mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">¡Hola, {{ nombre }}!</h2>
          <p class="text-gray-500 capitalize">{{ fechaActual }}</p>
        </div>

        <!-- Tarjetas resumen -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            v-for="tarjeta in tarjetasResumen"
            :key="tarjeta.etiqueta"
            class="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
          >
            <Icon :icon="tarjeta.icono" width="28" height="28" :class="tarjeta.color" />
            <div>
              <p class="text-sm text-gray-500">{{ tarjeta.etiqueta }}</p>
              <p class="font-bold text-gray-900">{{ tarjeta.valor }}</p>
            </div>
          </div>
        </div>

        <!-- Accesos rápidos -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <router-link
            to="/asientos"
            class="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm py-3 flex items-center justify-center gap-2 text-blue-600 font-medium transition"
          >
            <Icon icon="mdi:plus-box" width="20" height="20" />
            Registrar Asiento
          </router-link>

          <button
            type="button"
            class="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm py-3 flex items-center justify-center gap-2 text-gray-600 font-medium transition"
            @click="verLibroDiario"
          >
            <Icon icon="mdi:book-open" width="20" height="20" />
            Ver Libro Diario
          </button>

          <button
            type="button"
            class="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm py-3 flex items-center justify-center gap-2 text-green-600 font-medium transition"
            @click="verLibroMayor"
          >
            <Icon icon="mdi:book-multiple" width="20" height="20" />
            Ver Libro Mayor
          </button>

          <button
            type="button"
            class="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm py-3 flex items-center justify-center gap-2 text-cyan-600 font-medium transition"
            @click="verBalanceSumasYSaldos"
          >
            <Icon icon="mdi:chart-line" width="20" height="20" />
            Ver Balances
          </button>
        </div>

        <!-- Gráficos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div class="bg-white rounded-xl shadow-sm p-4 lg:col-span-2">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Sucursales por Ventas y Compras</h3>
            <div v-if="chartReadySucursales" class="h-72">
              <Bar :data="chartDataSucursales" :options="chartOptionsBar" />
            </div>
            <p v-else class="text-sm text-gray-400 py-8 text-center">No hay datos de sucursales</p>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Clientes que más compran</h3>
            <div v-if="chartReadyClientes" class="h-64">
              <Pie :data="chartDataClientes" :options="chartOptionsPie" />
            </div>
            <p v-else class="text-sm text-gray-400 py-8 text-center">No hay datos de clientes</p>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Proveedores a los que más se compra</h3>
            <div v-if="chartReadyProveedores" class="h-64">
              <Pie :data="chartDataProveedores" :options="chartOptionsPie" />
            </div>
            <p v-else class="text-sm text-gray-400 py-8 text-center">No hay datos de proveedores</p>
          </div>
        </div>

        <!-- Ayuda -->
        <div class="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
          <p class="font-semibold text-amber-900">¿Nuevo por aquí?</p>
          <p class="text-amber-800 text-sm mt-1">
            Te recomendamos leer nuestra
            <router-link to="/ayuda" class="underline font-medium">guía para empezar</router-link>.
          </p>
        </div>

      </div>
    </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Pie } from 'vue-chartjs'

import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { obtenerTopDatos as obtenerTopDatosService } from '@/services/graficosService'
import { obtenerUrlReportePdf, type TipoReporte } from '@/services/reportesService'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const { makeAlert } = useAlertas()
const sesion = useSesionStore()
const seleccion = useSeleccionStore()

// La empresa activa ya no se lee de localStorage: viene del store que armamos
// en el flujo de selección, y sobrevive a un F5 porque ese store tiene persist: true.
const idEmpresa = computed(() => seleccion.idEmpresa)

// ---------- Datos del usuario y la fecha ----------
const nombre = computed(() => sesion.nombre)
const fechaActual = ref('')

// ---------- Tarjetas resumen ----------
// Hoy son datos fijos (ref con valor inicial); cuando conectes la API real
// de cada uno, solo cambiás el valor de estos refs, el template no se toca.
const totalAsientos = ref(12)
const totalCuentas = ref(5)
const balanceActual = ref('$4,500')
const ultimosMovimientos = ref(4)

const tarjetasResumen = computed(() => [
  { etiqueta: 'Asientos registrados', valor: totalAsientos.value, icono: 'mdi:cash', color: 'text-green-600' },
  { etiqueta: 'Cuentas', valor: totalCuentas.value, icono: 'mdi:book', color: 'text-blue-600' },
  { etiqueta: 'Balance actual', valor: balanceActual.value, icono: 'mdi:chart-bar', color: 'text-cyan-600' },
  { etiqueta: 'Últimos movimientos', valor: ultimosMovimientos.value, icono: 'mdi:history', color: 'text-amber-600' }
])

// ---------- Gráficos: tipos ----------
interface ChartDataset {
  labels: string[]
  datasets: Array<{ label: string; data: number[]; backgroundColor: string | string[]; borderRadius?: number }>
}

const chartVacio = (): ChartDataset => ({ labels: [], datasets: [] })

const chartDataSucursales = ref<ChartDataset>(chartVacio())
const chartDataClientes = ref<ChartDataset>(chartVacio())
const chartDataProveedores = ref<ChartDataset>(chartVacio())

const chartLoadedSucursales = ref(false)
const chartLoadedClientes = ref(false)
const chartLoadedProveedores = ref(false)

const chartReadySucursales = computed(() => chartLoadedSucursales.value && chartDataSucursales.value.labels.length > 0)
const chartReadyClientes = computed(() => chartLoadedClientes.value && chartDataClientes.value.labels.length > 0)
const chartReadyProveedores = computed(() => chartLoadedProveedores.value && chartDataProveedores.value.labels.length > 0)

const chartOptionsBar = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    title: { display: false }
  },
  scales: { y: { beginAtZero: true } }
}

const chartOptionsPie = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const },
    title: { display: false }
  }
}

// ---------- Petición genérica para los 3 gráficos "top X" ----------
// Las tres llamadas anteriores (sucursales, clientes, proveedores) repetían:
// validar empresaId -> pedir a la API -> manejar el array de respuesta -> capturar error.
// Esa parte común vive acá; cada gráfico solo decide cómo mapear sus propios datos.
const obtenerTopDatos = async (tipo: 'top-sucursales' | 'top-clientes' | 'top-proveedores'): Promise<any[] | null> => {
  if (!idEmpresa.value) {
    makeAlert('Atención', 'No se encontró la empresa logueada.', 'warning')
    return null
  }
  try {
    const { data } = await obtenerTopDatosService(tipo, idEmpresa.value)
    return Array.isArray(data) ? data : (data?.data ?? [])
  } catch (error) {
    console.error(`Error cargando ${tipo}:`, error)
    return []
  }
}

const fetchSucursales = async () => {
  chartLoadedSucursales.value = false
  const data = await obtenerTopDatos('top-sucursales')

  chartDataSucursales.value = !data?.length
    ? chartVacio()
    : {
        labels: data.map((i) => i.nombre_sucursal),
        datasets: [
          { label: 'Ventas', data: data.map((i) => i.total_ventas), backgroundColor: 'rgba(54,162,235,0.7)', borderRadius: 6 },
          { label: 'Compras', data: data.map((i) => i.total_compras), backgroundColor: 'rgba(255,99,132,0.7)', borderRadius: 6 }
        ]
      }

  chartLoadedSucursales.value = true
}

const fetchClientes = async () => {
  chartLoadedClientes.value = false
  const data = await obtenerTopDatos('top-clientes')

  chartDataClientes.value = !data?.length
    ? chartVacio()
    : {
        labels: data.map((i) => i.razon_social),
        datasets: [
          {
            label: 'Clientes',
            data: data.map((i) => Number(i.total_ventas) || 0),
            backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF']
          }
        ]
      }

  chartLoadedClientes.value = true
}

const fetchProveedores = async () => {
  chartLoadedProveedores.value = false
  const data = await obtenerTopDatos('top-proveedores')

  chartDataProveedores.value = !data?.length
    ? chartVacio()
    : {
        labels: data.map((i) => i.razon_social),
        datasets: [
          {
            label: 'Proveedores',
            data: data.map((i) => Number(i.total_compras) || 0),
            backgroundColor: ['#FF9F40', '#FF6384', '#36A2EB', '#4BC0C0', '#9966FF']
          }
        ]
      }

  chartLoadedProveedores.value = true
}

const fetchAllData = () => Promise.all([fetchSucursales(), fetchClientes(), fetchProveedores()])

// ---------- Reportes PDF ----------
// Las 3 funciones de "ver libro/balance" eran la misma lógica copiada 3 veces,
// solo cambiando el endpoint. Quedan reducidas a una función genérica + 3 llamadas cortas.
const abrirReportePDF = (tipo: TipoReporte, nombreReporte: string) => {
  if (!idEmpresa.value) {
    makeAlert('Error', 'No se encontró el ID de la empresa logueada.', 'warning')
    return
  }
  const url = obtenerUrlReportePdf(tipo, idEmpresa.value)
  console.log(`URL PDF ${nombreReporte} generada:`, url)
  window.open(url, '_blank')
}

const verLibroDiario = () => abrirReportePDF('reporteslibrodiario', 'Libro Diario')
const verLibroMayor = () => abrirReportePDF('reporteslibromayor', 'Libro Mayor')
const verBalanceSumasYSaldos = () => abrirReportePDF('reportesbalancesumas', 'Balance de Sumas y Saldos')

// ---------- Montaje ----------
onMounted(() => {
  fechaActual.value = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (!idEmpresa.value) {
    makeAlert('Atención', 'Debe iniciar sesión para ver los gráficos.', 'warning')
    return
  }
  fetchAllData()
})
</script>