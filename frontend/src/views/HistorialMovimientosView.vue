<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Historial de movimientos</h2>
            <span class="text-sm text-gray-500">{{ seleccion.nombreSala || 'Sin sala' }}</span>
          </div>

          <p v-if="!seleccion.idSala" class="text-gray-500 text-sm">
            No hay una sala seleccionada. Volvé a <router-link to="/seleccion" class="text-green-700 underline">seleccionar tu sala</router-link> para ver el historial.
          </p>

          <template v-else>
            <div class="mb-4">
              <input
                v-model="busqueda"
                type="text"
                placeholder="Buscar por alumno, empresa, acción o descripción..."
                class="w-full sm:max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <p v-if="cargando && movimientos.length === 0" class="text-gray-400 text-sm">Cargando...</p>
            <p v-else-if="movimientosFiltrados.length === 0" class="text-gray-500 text-sm">No hay movimientos para mostrar.</p>

            <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Fecha</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Alumno</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Empresa</th>
                    <th class="text-left px-3 py-2 whitespace-nowrap">Acción</th>
                    <th class="text-left px-3 py-2">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="mov in movimientosFiltrados" :key="mov.id_movimiento" class="border-t border-gray-100 odd:bg-white even:bg-slate-50">
                    <td class="px-3 py-2 whitespace-nowrap text-gray-500">{{ formatearFecha(mov.createdAt) }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ mov.Usuario?.nombre ?? '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ mov.Empresa?.nombre ?? '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="colorEtiquetaTipo(mov.tipo)">
                        {{ etiquetaTipo(mov.tipo) }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-gray-700">{{ mov.descripcion }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between mt-4">
              <span class="text-xs text-gray-500">{{ movimientos.length }} de {{ total }}</span>
              <button
                v-if="movimientos.length < total"
                type="button"
                :disabled="cargando"
                class="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                @click="cargarMas"
              >
                {{ cargando ? 'Cargando...' : 'Cargar más' }}
              </button>
            </div>
          </template>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import { obtenerMovimientosPorSala, type Movimiento } from '@/services/MovimientoService'

const { makeToast } = useAlertas()
const seleccion = useSeleccionStore()

const TAMANO_PAGINA = 50

const movimientos = ref<Movimiento[]>([])
const total = ref(0)
const cargando = ref(false)

const cargarPagina = async (desde: number) => {
  if (!seleccion.idSala) return
  cargando.value = true
  try {
    const { data } = await obtenerMovimientosPorSala(seleccion.idSala, desde, TAMANO_PAGINA)
    total.value = data?.total ?? 0
    const nuevos: Movimiento[] = data?.movimientos ?? []
    movimientos.value = desde === 0 ? nuevos : [...movimientos.value, ...nuevos]
  } catch (error) {
    console.error('Error al cargar el historial de movimientos:', error)
    makeToast('No se pudo cargar el historial de movimientos.', 'error')
  } finally {
    cargando.value = false
  }
}

const cargarMas = () => cargarPagina(movimientos.value.length)

// ---------- Búsqueda (sobre lo ya cargado, no dispara otra página) ----------
const busqueda = ref('')
const movimientosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return movimientos.value
  return movimientos.value.filter((m) =>
    (m.Usuario?.nombre ?? '').toLowerCase().includes(q) ||
    (m.Empresa?.nombre ?? '').toLowerCase().includes(q) ||
    m.tipo.toLowerCase().includes(q) ||
    m.descripcion.toLowerCase().includes(q)
  )
})

// ---------- Etiquetas y colores por tipo de movimiento ----------
const ETIQUETAS_TIPO: Record<string, string> = {
  CREO_EMPRESA: 'Creó empresa',
  MODIFICO_EMPRESA: 'Modificó empresa',
  DESACTIVO_EMPRESA: 'Desactivó empresa',
  CREO_CUENTA: 'Creó cuenta',
  MODIFICO_CUENTA: 'Modificó cuenta',
  ELIMINO_CUENTA: 'Eliminó cuenta',
  CARGO_COMPRA: 'Cargó compra',
  MODIFICO_COMPRA: 'Modificó compra',
  ELIMINO_COMPRA: 'Eliminó compra',
  ANULO_COMPRA: 'Anuló compra',
  CARGO_VENTA: 'Cargó venta',
  MODIFICO_VENTA: 'Modificó venta',
  ELIMINO_VENTA: 'Eliminó venta',
  ANULO_VENTA: 'Anuló venta',
  ASIENTO_AUTOMATICO: 'Asiento automático',
  CARGO_ASIENTO: 'Cargó asiento',
  MODIFICO_ASIENTO: 'Modificó asiento',
  ELIMINO_ASIENTO: 'Eliminó asiento',
  PROCESO_ASIENTO: 'Procesó asiento',
  CERRO_EJERCICIO: 'Cerró ejercicio',
  GENERO_PDF_ASIENTOS: 'Generó PDF de asientos',
  GENERO_PDF_BALANCE_SUMAS: 'Generó PDF de balance',
  GENERO_PDF_CLIENTES: 'Generó PDF de clientes',
  GENERO_PDF_COMPRAS: 'Generó PDF de compras',
  GENERO_PDF_LIBRO_DIARIO: 'Generó PDF de libro diario',
  GENERO_PDF_LIBRO_MAYOR: 'Generó PDF de libro mayor',
  GENERO_PDF_PROVEEDORES: 'Generó PDF de proveedores',
  GENERO_PDF_VENTAS: 'Generó PDF de ventas'
}

// Si aparece un tipo nuevo que no está en el diccionario de arriba (por
// ejemplo, si mañana se agrega otro registrarMovimiento en el backend), se
// muestra igual, solo que "prolijado" en vez de con guiones bajos -nunca
// rompe la pantalla por un tipo desconocido.
const etiquetaTipo = (tipo: string) =>
  ETIQUETAS_TIPO[tipo] ?? tipo.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const colorEtiquetaTipo = (tipo: string) => {
  if (tipo.startsWith('CREO_') || tipo.startsWith('CARGO_') || tipo === 'ASIENTO_AUTOMATICO') return 'bg-green-100 text-green-700'
  if (tipo.startsWith('MODIFICO_') || tipo.startsWith('PROCESO_')) return 'bg-blue-100 text-blue-700'
  if (tipo.startsWith('ELIMINO_') || tipo.startsWith('ANULO_') || tipo.startsWith('DESACTIVO_') || tipo.startsWith('CERRO_')) return 'bg-red-100 text-red-700'
  if (tipo.startsWith('GENERO_PDF_')) return 'bg-gray-100 text-gray-600'
  return 'bg-gray-100 text-gray-600'
}

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

onMounted(() => {
  cargarPagina(0)
})
</script>