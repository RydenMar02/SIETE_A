<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2 py-4">
    <div class="w-full max-w-2xl bg-slate-700 text-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">
          Imputar {{ tipo === 'COMPRA' ? 'compra' : 'venta' }} N° {{ numeroFactura }}
        </h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="cerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <p class="text-sm text-slate-300 mb-4">
        Esta acción genera el asiento contable automáticamente a partir de esta
        {{ tipo === 'COMPRA' ? 'compra' : 'venta' }}. Una vez imputada, ya no se
        va a poder modificar ni eliminar — revisá bien el detalle antes de confirmar.
      </p>

      <p v-if="cargando" class="text-center text-slate-300 text-sm py-10">Calculando el asiento...</p>

      <p v-else-if="error" class="text-center text-red-300 text-sm py-10">{{ error }}</p>

      <div v-else-if="sugerencia" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-slate-400 mb-1">Documento</p>
            <p class="font-medium">{{ sugerencia.documento }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-1">Fecha</p>
            <p class="font-medium">{{ sugerencia.fecha }}</p>
          </div>
        </div>

        <div class="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
          <table class="w-full text-sm text-gray-900">
            <thead class="bg-slate-800 text-white">
              <tr>
                <th class="text-left px-3 py-2">Código</th>
                <th class="text-left px-3 py-2">Cuenta</th>
                <th class="text-right px-3 py-2">Debe</th>
                <th class="text-right px-3 py-2">Haber</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(linea, i) in sugerencia.detalles" :key="i" class="border-t border-gray-200">
                <td class="px-3 py-2">{{ linea.cuenta?.codigo ?? '—' }}</td>
                <td class="px-3 py-2">{{ linea.cuenta?.nombre ?? '—' }}</td>
                <td class="px-3 py-2 text-right">{{ linea.debe > 0 ? formatearImporte(linea.debe) : '' }}</td>
                <td class="px-3 py-2 text-right">{{ linea.haber > 0 ? formatearImporte(linea.haber) : '' }}</td>
              </tr>
              <tr v-if="sugerencia.detalles.length === 0">
                <td colspan="4" class="text-center text-gray-400 py-4">Sin líneas para generar</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-xs ml-auto text-right text-sm">
          <div>
            <p class="text-xs text-slate-400 mb-1">Total debe</p>
            <p class="font-semibold">{{ formatearImporte(totalDebe) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-1">Total haber</p>
            <p class="font-semibold">{{ formatearImporte(totalHaber) }}</p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-4">
        <button
          type="button"
          :disabled="!sugerencia || confirmando"
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition"
          @click="confirmarImputacion"
        >
          {{ confirmando ? 'Imputando...' : 'Confirmar e imputar' }}
        </button>
        <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="cerrar">
          Cancelar
        </button>
      </div>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { formatearImporte } from '@/composables/useFacturaCalculo'
import {
  obtenerSugerenciaAsiento,
  imputarCompraVenta,
  type SugerenciaAsiento,
  type TipoComprobante
} from '@/services/compraVentaService'

const props = defineProps<{
  idCompraVenta: number
  tipo: TipoComprobante
  numeroFactura: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void; (e: 'imputado'): void }>()

const { makeToast } = useAlertas()

const cargando = ref(true)
const confirmando = ref(false)
const error = ref('')
const sugerencia = ref<SugerenciaAsiento | null>(null)

const totalDebe = computed(() => (sugerencia.value?.detalles ?? []).reduce((acc, d) => acc + d.debe, 0))
const totalHaber = computed(() => (sugerencia.value?.detalles ?? []).reduce((acc, d) => acc + d.haber, 0))

const cargarSugerencia = async () => {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await obtenerSugerenciaAsiento(props.idCompraVenta)
    sugerencia.value = data
  } catch (err) {
    const data = (err as { response?: { data?: { msg?: string } } })?.response?.data
    error.value = data?.msg ?? 'No se pudo calcular el asiento a generar.'
  } finally {
    cargando.value = false
  }
}

const confirmarImputacion = async () => {
  confirmando.value = true
  try {
    await imputarCompraVenta(props.idCompraVenta)
    makeToast('Se imputó correctamente. El asiento ya se generó.', 'success')
    emit('imputado')
  } catch (err) {
    const data = (err as { response?: { data?: { msg?: string } } })?.response?.data
    makeToast(data?.msg ?? 'No se pudo imputar.', 'error')
  } finally {
    confirmando.value = false
  }
}

const cerrar = () => emit('cerrar')

onMounted(cargarSugerencia)
</script>