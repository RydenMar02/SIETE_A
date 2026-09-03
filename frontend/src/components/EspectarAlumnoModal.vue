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
          Esperando a que {{ nombreAlumno }} empiece a hacer algo...
        </p>

        <!-- Pantalla genérica: cubre cualquier tabla/listado instrumentado
             (Clientes, Proveedores, Empresas, Cuentas, Compras, Ventas,
             Sucursales). No es el detalle campo-a-campo de Asiento, pero
             muestra qué está mirando y si tiene un modal de carga/edición
             abierto — que es lo que hacía falta para no depender de que
             el alumno esté justo en Asiento para poder espectarlo. -->
        <div v-else-if="formulario.tipo === 'tabla'" class="flex flex-col gap-4 text-sm">
          <div>
            <p class="text-xs text-gray-500 mb-1">Pantalla</p>
            <p class="font-medium text-gray-900">{{ formulario.titulo || etiquetaPagina }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-gray-500 mb-1">Buscando</p>
              <p class="text-gray-900">{{ formulario.filtro || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Resultados visibles</p>
              <p class="text-gray-900">{{ formulario.totalRegistros ?? '—' }}</p>
            </div>
          </div>

          <div
            class="rounded-lg px-3 py-2 border"
            :class="formulario.accion === 'Viendo la tabla'
              ? 'bg-gray-50 border-gray-100'
              : 'bg-amber-50 border-amber-200'"
          >
            <p class="text-xs font-medium mb-1" :class="formulario.accion === 'Viendo la tabla' ? 'text-gray-500' : 'text-amber-700'">
              {{ formulario.accion === 'Viendo la tabla' ? 'Estado' : 'Haciendo ahora' }}
            </p>
            <p class="text-gray-800">
              {{ formulario.accion }}
              <span v-if="formulario.elemento"> — {{ formulario.elemento }}</span>
            </p>
          </div>
        </div>

        <!-- Ni siquiera "tabla" genérico: está en una pantalla sin
             instrumentar (ej. Inicio, Perfil) o todavía no llegó ningún
             estado nuevo. Al menos mostramos en qué ruta está. -->
        <p v-else-if="estado" class="text-center text-gray-400 text-sm py-10">
          {{ nombreAlumno }} está en {{ etiquetaPagina }}, sin más detalle disponible ahí.
        </p>

        <div v-if="formulario.tipo === 'asiento'" class="flex flex-col gap-4 text-sm">
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

      <div class="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
        <!-- Mientras espectás, le podés dejar un comentario puntual sin
             tener que salir del panel (ej. "revisá la cuenta Caja"). Usa
             el mismo canal de mensajería de Seguimiento en aula. -->
        <form class="flex gap-2" @submit.prevent="enviarComentario">
          <input
            v-model="textoMensaje"
            type="text"
            maxlength="500"
            :placeholder="`Dejale un comentario a ${nombreAlumno}...`"
            class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 rounded-lg transition">
            Enviar
          </button>
        </form>
        <div class="flex items-center justify-between">
          <p class="text-xs text-green-600" :class="{ 'invisible': !mensajeEnviado }">Comentario enviado ✓</p>
          <button type="button" class="text-sm text-gray-500 hover:text-gray-800 underline" @click="cerrar">
            Cerrar
          </button>
        </div>
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

interface FormularioEspectado {
  tipo?: string
  // Posibles campos del snapshot de Asiento (formulario detallado)
  sucursal?: string | null
  tipoAsiento?: string
  numeroAsiento?: string
  concepto?: string
  renglonEnCarga?: { codigo: string; cuenta: string; debe: string; haber: string }
  renglones?: { codigo: string; nombre: string; debe: number; haber: number }[]
  totalDebe?: number
  totalHaber?: number
  diferencia?: number
  // Posibles campos del snapshot genérico de tabla (Cliente, Empresa, etc.)
  titulo?: string
  filtro?: string
  totalRegistros?: number
  accion?: string
  elemento?: string | null
}

// Solo mostramos el estado si es del alumno que se está espectando puntualmente
// (por si el profesor cambió de alumno y todavía no llegó el primer evento nuevo).
const estado = computed(() => {
  const e = tiempoReal.estadoEspectado
  return e && e.id_alumno === props.idAlumno ? e : null
})

const formulario = computed(() => (estado.value?.formulario ?? {}) as unknown as FormularioEspectado)

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

// ---------- Comentario mientras se espectá ----------
const textoMensaje = ref('')
const mensajeEnviado = ref(false)
let temporizadorConfirmacion: ReturnType<typeof setTimeout> | null = null

const enviarComentario = () => {
  const texto = textoMensaje.value.trim()
  if (!texto) return

  tiempoReal.enviarMensaje(props.idSala, props.idAlumno, texto)
  textoMensaje.value = ''

  mensajeEnviado.value = true
  if (temporizadorConfirmacion) clearTimeout(temporizadorConfirmacion)
  temporizadorConfirmacion = setTimeout(() => { mensajeEnviado.value = false }, 2500)
}

onMounted(() => {
  tiempoReal.espectarAlumno(props.idSala, props.idAlumno)
})

onBeforeUnmount(() => {
  clearInterval(intervalo)
  if (temporizadorConfirmacion) clearTimeout(temporizadorConfirmacion)
  tiempoReal.dejarDeEspectar(props.idSala, props.idAlumno)
})
</script>