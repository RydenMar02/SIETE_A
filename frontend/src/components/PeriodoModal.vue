<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="w-full max-w-md bg-slate-700 text-white rounded-xl shadow-2xl p-6">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="guardarOModificar">
        <div>
          <label for="periodo" class="block text-sm font-medium mb-1.5">Período</label>
          <input
            id="periodo"
            v-model="form.periodo"
            type="text"
            maxlength="50"
            placeholder="Ej: 2026"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
            :class="errores.periodo ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
            @blur="errores.periodo = validarPeriodo(form.periodo)"
          />
          <p v-if="errores.periodo" class="text-red-300 text-xs mt-1">{{ errores.periodo }}</p>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-1">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
            {{ esModificacion ? 'Modificar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, computed } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import {
  crearPeriodo,
  modificarPeriodo,
  type Periodo,
  type PeriodoPayload
} from '@/services/periodoService'

const props = defineProps<{
  tituloModal: string
  periodo?: Periodo
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()

const esModificacion = computed(() => !!props.periodo?.id_periodo)

// ---------- Formulario ----------
const form = reactive({ periodo: props.periodo?.periodo ?? '' })

// ---------- Validación ----------
const validarPeriodo = (valor: string): string => {
  const p = valor.trim()
  if (!p) return 'Por favor, ingrese el período.'
  if (p.length < 2) return 'Debe tener al menos 2 caracteres.'
  return ''
}

const errores = reactive({ periodo: '' })

const formularioValido = (): boolean => {
  errores.periodo = validarPeriodo(form.periodo)
  return !errores.periodo
}

// ---------- Cerrar modal (con confirmación) ----------
const pedirCerrar = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      makeToast('La acción ha sido cancelada.', 'success')
      emit('cerrar')
    }
  })
}

// ---------- Guardar / modificar ----------
const guardarOModificar = async () => {
  if (!formularioValido()) {
    makeToast('Por favor corrija los campos marcados.', 'warning')
    return
  }

  const payload: PeriodoPayload = { periodo: form.periodo.trim() }

  try {
    if (esModificacion.value && props.periodo) {
      await modificarPeriodo(props.periodo.id_periodo, payload)
      makeToast('El período se modificó correctamente.', 'success')
    } else {
      await crearPeriodo(payload)
      makeToast('El período se guardó correctamente.', 'success')
    }
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, esModificacion.value ? 'No se pudo modificar el período.' : 'No se pudo crear el período.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}
</script>