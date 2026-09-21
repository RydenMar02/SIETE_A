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
    <ol class="flex flex-wrap gap-6 text-sm">
      <li :class="archivo ? '' : 'text-slate-500'">1. Seleccionar archivo</li>
      <li :class="archivoValidado ? '' : 'text-slate-500'">2. Validar{{ archivoValidado ? '' : (validando ? ' (validando...)' : ' (pendiente)') }}</li>
      <li :class="usuariosPreview.length ? '' : 'text-slate-500'">3. Previsualizar{{ usuariosPreview.length ? '' : ' (pendiente)' }}</li>
      <li class="text-slate-500">4. Importar{{ importando ? ' (importando...)' : ' (pendiente)' }}</li>
    </ol>
    <label class="block border-2 border-dashed rounded-xl p-6">Seleccionar archivo<input ref="inputFileRef" type="file" accept=".xlsx,.xls" class="block mt-3 max-w-full" @change="seleccionar"></label>
    <p v-if="archivo">{{ archivo.name }}</p><p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
    <p>Formato previsto: una fila por usuario, con las columnas <code>cedula, nombre, correo, telefono, rol</code>. Roles previstos: Profesor o Alumno; el contrato final se definirá con el backend.</p>
    <p>Los usuarios importados tendrán como contraseña inicial 12345678.</p>

    <div v-if="errores.length" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
      <p class="font-medium mb-1">{{ mensaje }}</p>
      <ul class="list-disc pl-5">
        <li v-for="(e, i) in errores" :key="i">Fila {{ e.fila }} — {{ e.campo }}: {{ e.msg }}</li>
      </ul>
    </div>
    <p v-else-if="mensaje" class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{{ mensaje }}</p>

    <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th v-for="c in columnas" :key="c" class="p-3 border-b">{{ c }}</th></tr></thead><tbody>
      <tr v-if="!usuariosPreview.length"><td colspan="5" class="p-8 text-center text-slate-500">La previsualización estará disponible cuando se conecte la validación.</td></tr>
      <tr v-for="usuario in usuariosPreview" :key="usuario.fila">
        <td class="p-3 border-b">{{ usuario.cedula }}</td>
        <td class="p-3 border-b">{{ usuario.nombre }}</td>
        <td class="p-3 border-b">{{ usuario.correo }}</td>
        <td class="p-3 border-b">{{ usuario.telefono }}</td>
        <td class="p-3 border-b">{{ usuario.rol }}</td>
      </tr>
    </tbody></table></div>
    <div class="flex gap-3">
      <button
        :disabled="!archivo || validando"
        class="rounded-lg px-4 py-2 transition"
        :class="(!archivo || validando) ? 'bg-slate-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'"
        @click="validar"
      >
        {{ validando ? 'Validando...' : 'Validar archivo' }}
      </button>
      <button
        :disabled="!archivo || !archivoValidado || importando"
        class="rounded-lg px-4 py-2 transition"
        :class="(!archivo || !archivoValidado || importando) ? 'bg-slate-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'"
        @click="importar"
      >
        {{ importando ? 'Importando...' : 'Importar usuarios' }}
      </button>
    </div>
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
import {
  validarImportacionUsuarios,
  importarUsuarios,
  type UsuarioImportadoPreview
} from '@/services/usuarioService'

const archivo = ref<File | null>(null)
const error = ref('')
const columnas = ['Cédula', 'Nombre', 'Correo', 'Teléfono', 'Rol']

const inputFileRef = ref<HTMLInputElement | null>(null)
const usuariosPreview = ref<UsuarioImportadoPreview[]>([])
const errores = ref<{ fila: number; campo: string; msg: string }[]>([])
const validando = ref(false)
const importando = ref(false)
const archivoValidado = ref(false)
const mensaje = ref('')

function seleccionar(event: Event) {
  const input = event.target as HTMLInputElement
  const seleccionado = input.files?.[0]
  archivo.value = null; error.value = ''
  usuariosPreview.value = []
  errores.value = []
  archivoValidado.value = false
  mensaje.value = ''
  if (!seleccionado) return
  if (!/\.(xlsx|xls)$/i.test(seleccionado.name)) { error.value = 'Seleccioná un archivo .xlsx o .xls.'; input.value = ''; return }
  archivo.value = seleccionado
}

async function validar() {
  if (!archivo.value) {
    error.value = 'Seleccioná un archivo antes de validar.'
    return
  }

  error.value = ''
  errores.value = []
  mensaje.value = ''
  validando.value = true
  try {
    const { data } = await validarImportacionUsuarios(archivo.value)
    usuariosPreview.value = data.usuarios
    archivoValidado.value = true
    errores.value = []
    mensaje.value = `Archivo válido. ${data.total} usuario${data.total === 1 ? '' : 's'} listos para importar.`
  } catch (e: any) {
    archivoValidado.value = false
    usuariosPreview.value = []
    const data = e?.response?.data
    if (data?.errores) {
      errores.value = data.errores
      mensaje.value = data.msg || 'El archivo contiene errores.'
    } else {
      mensaje.value = data?.msg || 'No se pudo validar el archivo.'
    }
  } finally {
    validando.value = false
  }
}

async function importar() {
  if (!archivo.value || !archivoValidado.value) return

  importando.value = true
  try {
    const { data } = await importarUsuarios(archivo.value)
    mensaje.value = `${data.total} usuario${data.total === 1 ? '' : 's'} importados correctamente.`
    errores.value = []
    archivo.value = null
    usuariosPreview.value = []
    archivoValidado.value = false
    if (inputFileRef.value) inputFileRef.value.value = ''
  } catch (e: any) {
    const data = e?.response?.data
    if (data?.errores) {
      errores.value = data.errores
      mensaje.value = data.msg || 'El archivo contiene errores.'
    } else {
      mensaje.value = data?.msg || 'No se pudo importar el archivo.'
    }
  } finally {
    importando.value = false
  }
}
</script>