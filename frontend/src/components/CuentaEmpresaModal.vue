<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[2000] pointer-events-none">
      <!-- Fondo oscurecido, cierra al tocar afuera -->
      <div class="absolute inset-0 bg-black/30 pointer-events-auto" @click="cerrar"></div>

      <!-- Panel lateral -->
      <div class="absolute top-0 right-0 h-full w-full max-w-md bg-slate-700 shadow-2xl flex flex-col pointer-events-auto">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 class="text-white font-semibold text-sm">Seleccione la cuenta</h2>
          <button type="button" class="text-slate-300 hover:text-white" @click="cerrar">
            <i class="ti ti-x text-xl"></i>
          </button>
        </div>

        <!-- Buscador -->
        <div class="px-4 py-3 border-b border-white/10">
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por código o nombre..."
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <!-- Tabla -->
        <div class="flex-1 overflow-y-auto bg-white">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-100 text-gray-700">
              <tr>
                <th class="text-left px-3 py-2 font-semibold w-28">Código</th>
                <th class="text-left px-3 py-2 font-semibold">Cuenta</th>
                <th class="text-left px-3 py-2 font-semibold w-24">Asentable</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in cuentasPaginadas"
                :key="item.id_cuenta"
                class="cursor-pointer hover:bg-blue-50 border-b border-gray-100"
                title="Seleccionar esta cuenta"
                @click="seleccionar(item)"
              >
                <td class="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{{ item.codigo }}</td>
                <td class="px-3 py-2 text-gray-900" :style="{ paddingLeft: `${12 + item.nivelIndentado * 14}px` }">
                  {{ item.nombre }}
                </td>
                <td class="px-3 py-2 text-gray-600">{{ item.asentable }}</td>
              </tr>
              <tr v-if="cuentasPaginadas.length === 0">
                <td colspan="3" class="text-center text-gray-400 py-6">No se encontraron resultados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-slate-300">
          <span>{{ inicioRango }} - {{ finRango }} / {{ cuentasFiltradas.length }}</span>
          <div class="flex gap-1">
            <button type="button" class="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-40" :disabled="pagina === 1" @click="pagina--">
              ‹
            </button>
            <button type="button" class="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-40" :disabled="pagina === totalPaginas" @click="pagina++">
              ›
            </button>
          </div>
        </div>

      </div>
    </div>
  </teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { obtenerEstructuraCuentas, type CuentaAplanada } from '@/services/cuentaService'
import { aplanarCuentas } from '@/composables/useCuentasArbol'

const emit = defineEmits<{
  (e: 'cerrarEmpresacuenta'): void
  (e: 'seleccionar', cuenta: CuentaAplanada): void
}>()

const { makeToast } = useAlertas()
const seleccion = useSeleccionStore()

const cerrar = () => emit('cerrarEmpresacuenta')

// Antes esto disparaba el evento comentado (`/* emit('seleccionar', item) */ null`),
// así que clickear una fila no hacía nada. Ahora sí emite y cierra el panel,
// que es el comportamiento esperable de un selector.
const seleccionar = (cuenta: CuentaAplanada) => {
  emit('seleccionar', cuenta)
  cerrar()
}

// ---------- Datos ----------
const cuentas = ref<CuentaAplanada[]>([])

const cargarCuentas = async () => {
  try {
    const { data } = await obtenerEstructuraCuentas(seleccion.idEmpresa)
    cuentas.value = aplanarCuentas(data)
  } catch (error) {
    console.error(error)
    makeToast('No se pudo cargar las cuentas.', 'error')
  }
}

onMounted(cargarCuentas)

// ---------- Búsqueda ----------
const busqueda = ref('')

const cuentasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return cuentas.value
  return cuentas.value.filter(
    (c) => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q)
  )
})

// ---------- Paginación ----------
const TAMANO_PAGINA = 15
const pagina = ref(1)

const totalPaginas = computed(() => Math.max(1, Math.ceil(cuentasFiltradas.value.length / TAMANO_PAGINA)))

const cuentasPaginadas = computed(() => {
  const inicio = (pagina.value - 1) * TAMANO_PAGINA
  return cuentasFiltradas.value.slice(inicio, inicio + TAMANO_PAGINA)
})

const inicioRango = computed(() => (cuentasFiltradas.value.length === 0 ? 0 : (pagina.value - 1) * TAMANO_PAGINA + 1))
const finRango = computed(() => Math.min(pagina.value * TAMANO_PAGINA, cuentasFiltradas.value.length))

watch(busqueda, () => { pagina.value = 1 })
</script>