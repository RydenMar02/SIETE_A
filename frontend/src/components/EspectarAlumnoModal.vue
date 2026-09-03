<template>
  <div class="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4" @click.self="cerrar">
    <div class="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p class="font-semibold text-gray-900">Espectando a {{ nombreAlumno }}</p>
          <p class="text-xs text-gray-400">{{ etiquetaPagina }}</p>
        </div>
        <button type="button" class="text-gray-400 hover:text-gray-600" @click="cerrar">
          <i class="ti ti-x text-lg"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <p v-if="!estado" class="text-center text-gray-400 text-sm py-10">
          Esperando a que {{ nombreAlumno }} empiece a cargar algo...
        </p>

        <p v-else-if="estado.ruta !== '/asiento'" class="text-center text-gray-400 text-sm py-10">
          {{ nombreAlumno }} no está en la pantalla de Asiento contable en este momento
          ({{ etiquetaPagina }}), así que no hay un formulario para mostrar acá todavía.
        </p>

        <div v-else class="flex flex-col gap-4 text-sm">
          <!-- Cabecera del asiento -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p class="text-xs text-gray-500 mb-1">Sucursal</p>
              <p class="font-medium text-gray-900">{{ formulario.sucursal || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Tipo</p>
              <p class="font-medium text-gray-900">{{ formulario.tipoAsiento || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">N° asiento</p>
              <p class="font-medium text-gray-900">{{ formulario.numeroAsiento || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Actualizado</p>
              <p class="font-medium text-gray-900">hace {{ tiempoRelativo }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Concepto</p>
            <p class="text-gray-900">{{ formulario.concepto || '—' }}</p>
          </div>

          <!-- Renglón que está tipeando ahora mismo, antes de agregarlo -->
          <div v-if="hayRenglonEnCarga" class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p class="text-xs text-amber-700 font-medium mb-1">Escribiendo ahora...</p>
            <p class="text-gray-800">
              {{ formulario.renglonEnCarga?.codigo || '—' }} · {{ formulario.renglonEnCarga?.cuenta || 'sin cuenta' }}
              · Debe {{ formulario.renglonEnCarga?.debe || 0 }} · Haber {{ formulario.renglonEnCarga?.haber || 0 }}
            </p>
          </div>

          <!-- Renglones ya agregados -->
          <div class="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
            <table class="w-full text-sm">
              <thead class="bg-slate-700 text-white">
                <tr>
                  <th class="text-left px-3 py-2">Código</th>
                  <th class="text-left px-3 py-2">Cuenta</th>
                  <th class="text-right px-3 py-2">Debe</th>
                  <th class="text-right px-3 py-2">Haber</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in formulario.renglones" :key="i" class="border-t border-gray-100">
                  <td class="px-3 py-2">{{ r.codigo }}</td>
                  <td class="px-3 py-2">{{ r.nombre }}</td>
                  <td class="px-3 py-2 text-right">{{ r.debe }}</td>
                  <td class="px-3 py-2 text-right">{{ r.haber }}</td>
                </tr>
                <tr v-if="(formulario.renglones?.length ?? 0) === 0">
                  <td colspan="4" class="text-center text-gray-400 py-4">Todavía no cargó ninguna cuenta</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totales -->
          <div class="grid grid-cols-3 gap-3 max-w-md ml-auto text-right">
            <div>
              <p class="text-xs text-gray-500 mb-1">Diferencia</p>
              <p class="font-semibold" :class="formulario.diferencia ? 'text-red-600' : 'text-green-600'">
                {{ formulario.diferencia ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Total debe</p>
              <p class="font-semibold text-gray-900">{{ formulario.totalDebe ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Total haber</p>
              <p class="font-semibold text-gray-900">{{ formulario.totalHaber ?? 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 px-4 py-3 flex justify-end">
        <button
          type="button"
          class="bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          @click="cerrar"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useTiempoRealStore } from '@/stores/useTiempoRealStore'

// Panel de solo lectura: no reutiliza AsientoContableModal a propósito, ese
// tiene inputs editables y lógica de guardado — acá el profesor solo mira,
// nunca escribe. Si el día de mañana se espejan más pantallas además de
// Asiento, este panel puede ir armando una sección por cada "ruta" conocida.
const props = defineProps<{
  idSala: number
  idAlumno: number
  nombreAlumno: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const tiempoReal = useTiempoRealStore()

interface FormularioAsiento {
  sucursal: string | null
  tipoAsiento: string
  numeroAsiento: string
  concepto: string
  renglonEnCarga?: { codigo: string; cuenta: string; debe: string; haber: string }
  renglones: { codigo: string; nombre: string; debe: number; haber: number }[]
  totalDebe: number
  totalHaber: number
  diferencia: number
}

// Solo mostramos el estado si es del alumno que se está espectando puntualmente
// (por si el profesor cambió de alumno y todavía no llegó el primer evento nuevo).
const estado = computed(() => {
  const e = tiempoReal.estadoEspectado
  return e && e.id_alumno === props.idAlumno ? e : null
})

const formulario = computed(() => (estado.value?.formulario ?? {}) as unknown as FormularioAsiento)

const hayRenglonEnCarga = computed(() => {
  const r = formulario.value.renglonEnCarga
  return !!(r && (r.codigo || r.cuenta || r.debe || r.haber))
})

const ETIQUETAS_PAGINA: Record<string, string> = {
  '/menu': 'Inicio',
  '/asiento': 'Asientos contables',
  '/cliente': 'Clientes',
  '/proveedor': 'Proveedores',
  '/empresa': 'Empresas',
  '/sucursal': 'Sucursales',
  '/cuentas': 'Plan de cuentas',
  '/compra': 'Compras',
  '/venta': 'Ventas',
  '/perfil': 'Perfil',
  '/seguimiento-aula': 'Seguimiento en aula'
}
const etiquetaPagina = computed(() => {
  const ruta = estado.value?.ruta
  return ruta ? (ETIQUETAS_PAGINA[ruta] ?? ruta) : 'Sin actividad reciente'
})

// Ticker liviano para "hace X" sin recargar
const ahora = ref(Date.now())
const intervalo = setInterval(() => { ahora.value = Date.now() }, 5000)

const tiempoRelativo = computed(() => {
  if (!estado.value) return '—'
  const segundos = Math.max(0, Math.floor((ahora.value - estado.value.timestamp) / 1000))
  if (segundos < 60) return `${segundos}s`
  return `${Math.floor(segundos / 60)} min`
})

const cerrar = () => emit('cerrar')

onMounted(() => {
  tiempoReal.espectarAlumno(props.idSala, props.idAlumno)
})

onBeforeUnmount(() => {
  clearInterval(intervalo)
  tiempoReal.dejarDeEspectar(props.idSala, props.idAlumno)
})
</script>