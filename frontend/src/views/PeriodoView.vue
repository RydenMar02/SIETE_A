<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <div>
              <h2 class="text-2xl font-semibold text-gray-900">Períodos</h2>
              <p v-if="ejercicio" class="text-sm text-gray-500">Ejercicio: {{ ejercicio.nombre }}</p>
            </div>
          </div>

          <p v-if="cargando" class="text-gray-500 text-sm">Cargando períodos...</p>

          <p v-else-if="!ejercicio" class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2">
            No hay un ejercicio abierto en esta sala.
          </p>

          <div v-else class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-700 text-white">
                  <tr>
                    <th class="text-left px-3 py-2">Período</th>
                    <th class="text-left px-3 py-2">Fecha inicio</th>
                    <th class="text-left px-3 py-2">Fecha fin</th>
                    <th class="text-left px-3 py-2">Estado</th>
                    <th class="text-center px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="periodo in periodos" :key="periodo.id_periodo" class="border-b border-gray-100 odd:bg-white even:bg-slate-100 hover:bg-green-50 transition-colors">
                    <td class="px-3 py-2 font-medium text-gray-900">{{ periodo.nombre }}</td>
                    <td class="px-3 py-2">{{ periodo.fecha_inicio }}</td>
                    <td class="px-3 py-2">{{ periodo.fecha_fin }}</td>
                    <td class="px-3 py-2">
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="periodo.estado === 'ABIERTO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                      >
                        {{ periodo.estado }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button
                        v-if="periodo.estado === 'ABIERTO'"
                        type="button"
                        class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                        @click="cerrarPeriodo(periodo)"
                      >
                        Cerrar período
                      </button>
                      <span v-else class="text-gray-400 text-xs">Período cerrado</span>
                    </td>
                  </tr>
                  <tr v-if="periodos.length === 0">
                    <td colspan="5" class="text-center text-gray-400 py-6">No hay períodos disponibles en este ejercicio.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import { obtenerEjerciciosPorSala, type Ejercicio } from '@/services/ejercicioService'
import { obtenerPeriodosPorEjercicio, cambiarEstadoPeriodo, type Periodo } from '@/services/periodoService'

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Datos ----------
const cargando = ref(true)
const ejercicio = ref<Ejercicio | null>(null)
const periodos = ref<Periodo[]>([])

const cargarDatos = async () => {
  cargando.value = true
  try {
    // No existe un endpoint que devuelva "el ejercicio abierto" directo:
    // se listan los de la sala (ya vienen del más reciente al más viejo)
    // y se toma el primero que siga ABIERTO -mismo mecanismo que ya usa
    // el resto del proyecto (ver comentario en ejercicioService.ts).
    const { data } = await obtenerEjerciciosPorSala(seleccion.idSala)
    const ejercicios: Ejercicio[] = data?.ejercicios ?? []
    ejercicio.value = ejercicios.find((e) => e.estado === 'ABIERTO') ?? null

    if (ejercicio.value) {
      const { data: dataPeriodos } = await obtenerPeriodosPorEjercicio(ejercicio.value.id_ejercicio)
      periodos.value = dataPeriodos?.periodos ?? []
    } else {
      periodos.value = []
    }
  } catch (error) {
    manejarError(error, 'No se pudieron cargar los períodos.')
  } finally {
    cargando.value = false
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Cerrar período ----------
const cerrarPeriodo = (periodo: Periodo) => {
  makeConfirm(
    `¿Estás seguro de que deseas cerrar el período ${periodo.nombre}?`,
    'Esta acción no se puede deshacer desde esta pantalla.',
    'Cerrar período'
  ).then(async (result) => {
    if (!result.isConfirmed) return

    try {
      // Llama al endpoint YA EXISTENTE (PATCH /:id/estado) -no se inventó
      // ninguno nuevo. El bloqueo de operaciones contables sobre un
      // período cerrado ya lo aplica el backend, no se repite acá.
      await cambiarEstadoPeriodo(periodo.id_periodo, 'CERRADO')
      makeToast('Período cerrado correctamente', 'success')
      // Se vuelve a consultar el backend en vez de quitar el ítem a mano
      // en memoria, para reflejar el estado real.
      await cargarDatos()
    } catch (error) {
      manejarError(error, 'No se pudo cerrar el período.')
    }
  })
}

onMounted(cargarDatos)
</script>