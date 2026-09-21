<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-6">
    <div class="w-full max-w-md bg-slate-700 text-white rounded-xl shadow-2xl p-6">

      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">Cambiar contraseña</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="$emit('cerrar')">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="enviar">
        <div>
          <label class="block text-sm font-medium mb-1.5">Contraseña actual</label>
          <input
            v-model="form.contraActual"
            type="password"
            autocomplete="current-password"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Nueva contraseña</label>
          <input
            v-model="form.contraNueva"
            type="password"
            autocomplete="new-password"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Repetir nueva contraseña</label>
          <input
            v-model="form.contraRepetida"
            type="password"
            autocomplete="new-password"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p v-if="error" role="alert" class="bg-red-900/40 border border-red-500 text-red-200 text-sm rounded-lg px-3 py-2">
          {{ error }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-600 transition" @click="$emit('cerrar')">
            Cancelar
          </button>
          <button type="submit" :disabled="enviando" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition">
            {{ enviando ? 'Cambiando...' : 'Cambiar Contraseña' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { cambiarMiPassword } from '@/services/usuarioService'

const emit = defineEmits<{ cerrar: [] }>()
const { makeToast } = useAlertas()

// Solo viven en memoria mientras el modal está abierto -nunca en
// localStorage/sessionStorage/Pinia, y nunca se lee usuario.contra desde
// ningún lado: el backend valida la contraseña actual contra el hash real.
const form = reactive({
  contraActual: '',
  contraNueva: '',
  contraRepetida: ''
})

const enviando = ref(false)
const error = ref('')

const limpiarFormulario = () => {
  form.contraActual = ''
  form.contraNueva = ''
  form.contraRepetida = ''
}

const enviar = async () => {
  error.value = ''

  if (!form.contraActual) {
    error.value = 'Ingresá tu contraseña actual.'
    return
  }
  if (!form.contraNueva) {
    error.value = 'Ingresá la nueva contraseña.'
    return
  }
  if (!form.contraRepetida) {
    error.value = 'Repetí la nueva contraseña.'
    return
  }
  if (form.contraNueva.length < 8) {
    error.value = 'La nueva contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (form.contraNueva === form.contraActual) {
    error.value = 'La nueva contraseña no puede ser igual a la actual.'
    return
  }
  if (form.contraNueva !== form.contraRepetida) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  enviando.value = true
  try {
    // "Repetir contraseña" es solo validación de este formulario -nunca
    // se envía. Tampoco se envía id_usuario/id_rol/estado ni ningún dato
    // del perfil: el backend identifica al usuario exclusivamente por el JWT.
    await cambiarMiPassword({
      contra_actual: form.contraActual,
      contra_nueva: form.contraNueva
    })

    makeToast('Contraseña actualizada correctamente', 'success')
    limpiarFormulario()
    emit('cerrar')
  } catch (e: any) {
    error.value = e?.response?.data?.msg || 'No se pudo cambiar la contraseña.'
  } finally {
    enviando.value = false
  }
}
</script>