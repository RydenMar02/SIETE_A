<template>
  <dialog ref="dialogo" aria-labelledby="nuevo-titulo" class="m-auto w-[min(95vw,36rem)] rounded-xl p-6 backdrop:bg-black/50" @cancel="cancelar">
    <form @submit.prevent="guardar">
      <h2 id="nuevo-titulo" class="text-xl font-semibold mb-5">Nuevo usuario</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="sm:col-span-2">Nombre<input v-model.trim="form.nombre" required maxlength="50" class="campo" autocomplete="name"></label>
        <label>Cédula<input v-model.trim="form.cedula" required maxlength="8" class="campo"></label>
        <label>Teléfono<input v-model.trim="form.telefono" required maxlength="10" type="tel" class="campo"></label>
        <label class="sm:col-span-2">Correo<input v-model.trim="form.correo" required maxlength="50" type="email" class="campo"></label>
        <label>Rol<select v-model.number="form.id_rol" class="campo"><option :value="2">Profesor</option><option :value="3">Alumno</option></select></label>
      </div>
      <p class="rounded-lg bg-amber-50 p-3 my-5 text-sm">La contraseña inicial será 12345678. Debe cambiarse al comenzar a utilizar la cuenta.</p>
      <p v-if="error" role="alert" class="text-red-700 mb-4">{{ error }}</p>
      <div class="flex justify-end gap-3"><button type="button" :disabled="cargando" @click="emit('cerrar')">Cancelar</button><button :disabled="cargando" class="bg-green-700 text-white rounded-lg px-5 py-2 disabled:opacity-50">{{ cargando ? 'Guardando...' : 'Guardar' }}</button></div>
    </form>
  </dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { isAxiosError } from 'axios'
import { crearUsuarioAdmin } from '@/services/usuarioService'
const emit = defineEmits<{ cerrar: []; creado: [] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const cargando = ref(false)
const error = ref('')
const form = reactive({ nombre: '', cedula: '', correo: '', telefono: '', id_rol: 3 })
onMounted(() => dialogo.value?.showModal())
function cancelar(event: Event) { event.preventDefault(); if (!cargando.value) emit('cerrar') }
async function guardar() {
  if (cargando.value) return
  if (!form.nombre || !form.cedula || !form.correo || !form.telefono || ![2, 3].includes(form.id_rol)) { error.value = 'Completá todos los campos.'; return }
  cargando.value = true
  error.value = ''
  try { await crearUsuarioAdmin(form); emit('creado') }
  catch (e) { error.value = isAxiosError<{ msg?: string }>(e) ? e.response?.data?.msg ?? 'No se pudo crear el usuario.' : 'No se pudo crear el usuario.' }
  finally { cargando.value = false }
}
</script>
<style scoped>
.campo { display:block; width:100%; margin-top:0.375rem; border:1px solid #cbd5e1; border-radius:0.5rem; padding:0.625rem; background:white; }
</style>
