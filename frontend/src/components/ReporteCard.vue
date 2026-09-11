<template>
  <div
    :id="`reporte-${tipo}`"
    class="bg-white rounded-lg border overflow-hidden transition-shadow duration-300"
    :class="destacada ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-200'"
  >
    <div class="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
      <h3 class="font-medium text-gray-800">{{ titulo }}</h3>
    </div>

    <div class="p-4 flex flex-col gap-3">
      <div class="flex flex-wrap gap-3">
        <div class="flex-1 min-w-32.5">
          <label class="block text-xs text-gray-500 mb-1">Desde</label>
          <input v-model="desde" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div class="flex-1 min-w-32.5">
          <label class="block text-xs text-gray-500 mb-1">Hasta</label>
          <input v-model="hasta" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      <button
        type="button"
        :disabled="generando"
        class="self-end bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2 rounded-lg transition"
        @click="onGenerar"
      >
        {{ generando ? 'Generando...' : 'Generar reporte' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import type { TipoReporte } from '@/services/reportesService'

const props = defineProps<{
  tipo: TipoReporte
  titulo: string
  generando: boolean
  destacada?: boolean
}>()

const emit = defineEmits<{
  (e: 'generar', payload: { tipo: TipoReporte; fechaDesde: string; fechaHasta: string }): void
}>()

const { makeToast } = useAlertas()

// YYYY-MM-DD en horario local (no toISOString, que se corre de día cerca
// de la medianoche según el huso horario del navegador).
const aISO = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

const hoy = new Date()
const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

const desde = ref(aISO(primerDiaDelMes))
const hasta = ref(aISO(hoy))

const onGenerar = () => {
  if (props.generando) return // por las dudas: el botón ya queda disabled, pero cubrimos doble-click de todos modos

  if (!desde.value || !hasta.value) {
    makeToast('Completá las fechas "Desde" y "Hasta" para generar el reporte.', 'warning')
    return
  }

  // Comparación como texto: alcanza porque el input date siempre entrega
  // YYYY-MM-DD, formato donde el orden alfabético coincide con el cronológico.
  if (desde.value > hasta.value) {
    makeToast('La fecha "Desde" no puede ser posterior a "Hasta".', 'warning')
    return
  }

  emit('generar', { tipo: props.tipo, fechaDesde: desde.value, fechaHasta: hasta.value })
}
</script>