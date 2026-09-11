<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <div class="flex flex-1">
      <Siderbar />
      <main class="flex-1 min-w-0 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
  <h1 class="text-2xl font-semibold mb-2">Importar usuarios desde Excel</h1>
  <p class="text-slate-500 mb-6">Seleccione un archivo Excel con los usuarios que desea registrar.</p>
  <div class="bg-white rounded-xl border p-6 space-y-5">
    <p class="bg-amber-50 rounded-lg p-3">Funcionalidad pendiente de conexión con backend. El archivo no se procesa ni se envía.</p>
    <ol class="flex flex-wrap gap-6 text-sm"><li>1. Seleccionar archivo</li><li class="text-slate-500">2. Validar (pendiente)</li><li class="text-slate-500">3. Previsualizar (pendiente)</li><li class="text-slate-500">4. Importar (pendiente)</li></ol>
    <label class="block border-2 border-dashed rounded-xl p-6">Seleccionar archivo<input type="file" accept=".xlsx,.xls" class="block mt-3 max-w-full" @change="seleccionar"></label>
    <p v-if="archivo">{{ archivo.name }}</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
    <p>Formato previsto: una fila por usuario, con las columnas <code>cedula, nombre, correo, telefono, rol</code>. Roles previstos: Profesor o Alumno; el contrato final se definirá con el backend.</p>
    <p>Los usuarios importados tendrán como contraseña inicial 12345678.</p>
    <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th v-for="c in columnas" :key="c" class="p-3 border-b">{{ c }}</th></tr></thead><tbody><tr><td colspan="5" class="p-8 text-center text-slate-500">La previsualización estará disponible cuando se conecte la validación.</td></tr></tbody></table></div>
    <div class="flex gap-3"><button disabled class="bg-slate-200 rounded-lg px-4 py-2 cursor-not-allowed">Validar archivo</button><button disabled class="bg-slate-200 rounded-lg px-4 py-2 cursor-not-allowed">Importar usuarios</button></div>
  </div>
        </div>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'

import { ref } from 'vue'
const archivo = ref<File | null>(null)
const error = ref('')
const columnas = ['Cédula', 'Nombre', 'Correo', 'Teléfono', 'Rol']
function seleccionar(event: Event) {
  const input = event.target as HTMLInputElement
  const seleccionado = input.files?.[0]
  archivo.value = null; error.value = ''
  if (!seleccionado) return
  if (!/\.(xlsx|xls)$/i.test(seleccionado.name)) { error.value = 'Seleccioná un archivo .xlsx o .xls.'; input.value = ''; return }
  archivo.value = seleccionado
}
</script>
