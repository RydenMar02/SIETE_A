<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          <div class="border-b border-gray-200 pb-3 mb-1">
            <h2 class="text-2xl font-semibold text-gray-900">Reportes</h2>
          </div>
          <p class="text-sm text-gray-500 mb-4">Seleccioná el período y generá el reporte que necesites.</p>

          <p v-if="!seleccion.idEmpresa" class="text-gray-500 text-sm">
            No hay una empresa seleccionada. Volvé a <router-link to="/seleccion" class="text-green-700 underline">seleccionarla</router-link> para generar reportes.
          </p>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReporteCard
              v-for="reporte in REPORTES"
              :key="reporte.tipo"
              :tipo="reporte.tipo"
              :titulo="reporte.titulo"
              :generando="generandoTipo === reporte.tipo"
              :destacada="tipoDestacado === reporte.tipo"
              @generar="manejarGenerar"
            />
          </div>

        </div>
      </main>
    </div>

    <ReportePdfModal
      v-if="modalActivo"
      :url="modalActivo.url"
      :titulo="modalActivo.titulo"
      :nombre-archivo="modalActivo.nombreArchivo"
      @cerrar="cerrarModal"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import ReporteCard from '@/components/ReporteCard.vue'
import ReportePdfModal from '@/components/ReportePdfModal.vue'
import { obtenerBlobReportePdf, type TipoReporte } from '@/services/reportesService'

const route = useRoute()
const { makeToast } = useAlertas()
const seleccion = useSeleccionStore()

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: { msg?: string } } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

const REPORTES: { tipo: TipoReporte; titulo: string }[] = [
  { tipo: 'asientos', titulo: 'Asientos contables' },
  { tipo: 'clientes', titulo: 'Clientes' },
  { tipo: 'proveedores', titulo: 'Proveedores' },
  { tipo: 'compras', titulo: 'Compras' },
  { tipo: 'ventas', titulo: 'Ventas' },
  { tipo: 'libro-diario', titulo: 'Libro Diario' },
  { tipo: 'libro-mayor', titulo: 'Libro Mayor' },
  { tipo: 'balance-sumas', titulo: 'Balance de Sumas y Saldos' }
]

const TIPOS_VALIDOS = new Set(REPORTES.map((r) => r.tipo))

// ---------- Generación + vista previa ----------
const generandoTipo = ref<TipoReporte | null>(null)

interface ModalPdf {
  url: string
  titulo: string
  nombreArchivo: string
}
const modalActivo = ref<ModalPdf | null>(null)

const cerrarModal = () => {
  if (modalActivo.value) URL.revokeObjectURL(modalActivo.value.url)
  modalActivo.value = null
}

const manejarGenerar = async ({ tipo, fechaDesde, fechaHasta }: { tipo: TipoReporte; fechaDesde: string; fechaHasta: string }) => {
  if (!seleccion.idEmpresa) {
    makeToast('No hay una empresa seleccionada.', 'error')
    return
  }
  if (generandoTipo.value) return // ya hay un reporte generándose, evita disparar otro en simultáneo

  generandoTipo.value = tipo
  try {
    // Si había un PDF abierto de un reporte anterior, se revoca antes de
    // pedir el nuevo -nunca quedan dos blob URLs vivas al mismo tiempo.
    if (modalActivo.value) {
      URL.revokeObjectURL(modalActivo.value.url)
      modalActivo.value = null
    }

    const url = await obtenerBlobReportePdf(tipo, seleccion.idEmpresa, {
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta
    })

    const titulo = REPORTES.find((r) => r.tipo === tipo)?.titulo ?? 'Reporte'
    modalActivo.value = { url, titulo, nombreArchivo: `${tipo}_${fechaDesde}_${fechaHasta}.pdf` }
  } catch (error) {
    manejarError(error, 'No se pudo generar el reporte. Verificá que existan registros en el rango elegido.')
  } finally {
    generandoTipo.value = null
  }
}

onBeforeUnmount(() => {
  if (modalActivo.value) URL.revokeObjectURL(modalActivo.value.url)
})

// ---------- Acceso rápido desde MenuView (?tipo=libro-diario, etc.) ----------
// Solo desplaza y resalta la tarjeta -nunca genera el reporte solo: el
// usuario siempre revisa las fechas y aprieta "Generar reporte" a mano.
const tipoDestacado = ref<TipoReporte | null>(null)

onMounted(async () => {
  const tipoQuery = route.query.tipo
  if (typeof tipoQuery !== 'string' || !TIPOS_VALIDOS.has(tipoQuery as TipoReporte)) return

  const tipo = tipoQuery as TipoReporte
  tipoDestacado.value = tipo

  await nextTick()
  document.getElementById(`reporte-${tipo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  setTimeout(() => {
    if (tipoDestacado.value === tipo) tipoDestacado.value = null
  }, 2500)
})
</script>