<template>
  <div class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3">
    <div class="w-[97vw] h-[95vh] flex flex-col sm:flex-row gap-3">

      <!-- PDF -->
      <div class="flex-1 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden min-h-75">
        <div class="flex items-center justify-between px-4 py-2.5 bg-slate-700 text-white shrink-0">
          <p class="font-medium text-sm truncate pr-2">Reporte — {{ nombreAlumno }} ({{ fechaLegible }})</p>
          <button type="button" class="text-slate-300 hover:text-white shrink-0" @click="cerrar">
            <i class="ti ti-x text-lg"></i>
          </button>
        </div>

        <div class="flex-1 flex items-center justify-center">
          <p v-if="cargandoPdf" class="text-gray-400 text-sm">Generando el reporte...</p>
          <p v-else-if="errorPdf" class="text-red-500 text-sm px-6 text-center">{{ errorPdf }}</p>
          <iframe v-else :src="blobUrl" class="w-full h-full border-0" title="Reporte de actividad del alumno"></iframe>
        </div>
      </div>

      <!-- Chat -->
      <div class="w-full sm:w-72 shrink-0 h-64 sm:h-full">
        <ChatConversacion :id-sala="idSala" :id-alumno="idAlumno" :nombre-alumno="nombreAlumno" @cerrar="cerrar" />
      </div>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ChatConversacion from './ChatConversacion.vue'
import { obtenerBlobReporteActividadAlumno } from '@/services/reportesService'

const props = defineProps<{
  idSala: number
  idAlumno: number
  nombreAlumno: string
  // YYYY-MM-DD -se pide explícito en vez de calcularlo acá adentro para
  // que quien abre el panel decida "hoy" una sola vez y quede consistente
  // mientras el panel esté abierto.
  fecha: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const cargandoPdf = ref(true)
const errorPdf = ref('')
const blobUrl = ref('')

const fechaLegible = computed(() => {
  const [anio, mes, dia] = props.fecha.split('-')
  return `${dia}/${mes}/${anio}`
})

const cargarReporte = async () => {
  cargandoPdf.value = true
  errorPdf.value = ''
  try {
    blobUrl.value = await obtenerBlobReporteActividadAlumno(props.idSala, props.idAlumno, props.fecha)
  } catch (error) {
    // La respuesta de error también viene como blob (por responseType:
    // 'blob'), así que si el backend mandó JSON con un mensaje, hay que
    // leerlo como texto en vez de asumir que error.response.data.msg
    // existe directo -si no, mostramos un mensaje genérico.
    const blobError = (error as { response?: { data?: Blob } })?.response?.data
    if (blobError instanceof Blob) {
      try {
        const texto = await blobError.text()
        const parsed = JSON.parse(texto)
        errorPdf.value = parsed?.msg ?? 'No se pudo generar el reporte.'
      } catch {
        errorPdf.value = 'No se pudo generar el reporte.'
      }
    } else {
      errorPdf.value = 'No se pudo generar el reporte.'
    }
    console.error('Error al generar el reporte de actividad:', error)
  } finally {
    cargandoPdf.value = false
  }
}

const cerrar = () => emit('cerrar')

onMounted(cargarReporte)

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>