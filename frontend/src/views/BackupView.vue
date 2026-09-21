<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <div class="flex flex-1">
      <Siderbar />
      <main class="flex-1 min-w-0 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
  <h1 class="text-2xl font-semibold mb-2">Copia de seguridad</h1>
  <p class="text-slate-500 mb-6">Desde esta sección podrá generar una copia de seguridad completa de la base de datos.</p>
  <section class="bg-white border rounded-xl p-6 max-w-2xl">
    <h2 class="font-semibold mb-3">Respaldo del sistema</h2>
    <p class="text-sm text-slate-500 mb-5">Al generar el backup se descargará un archivo .sql con la estructura y los datos completos de la base de datos.</p>
    <p v-if="mensaje" class="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-5 text-sm">{{ mensaje }}</p>
    <p v-if="error" role="alert" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">{{ error }}</p>
    <button
      :disabled="descargando"
      class="rounded-lg px-5 py-3 transition"
      :class="descargando ? 'bg-slate-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'"
      @click="generarBackup"
    >
      {{ descargando ? 'Generando backup...' : 'Generar backup' }}
    </button>
  </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
import { descargarBackup } from '@/services/backupService'

const descargando = ref(false)
const mensaje = ref('')
const error = ref('')

function extraerNombreArchivo(contentDisposition: unknown): string {
  const fallback = 'SIETE_A_backup.sql'
  if (typeof contentDisposition !== 'string') return fallback
  const match = /filename="?([^";]+)"?/.exec(contentDisposition)
  return match?.[1] || fallback
}

async function extraerMensajeError(data: unknown): Promise<string> {
  const fallback = 'No se pudo generar el backup.'
  if (data instanceof Blob) {
    try {
      const texto = await data.text()
      const json = JSON.parse(texto)
      return typeof json?.msg === 'string' ? json.msg : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

async function generarBackup() {
  if (descargando.value) return

  descargando.value = true
  mensaje.value = ''
  error.value = ''

  try {
    const response = await descargarBackup()
    const nombreArchivo = extraerNombreArchivo(response.headers['content-disposition'])

    const url = URL.createObjectURL(response.data)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivo
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(url)

    mensaje.value = `Backup generado correctamente: ${nombreArchivo}`
  } catch (e: any) {
    error.value = await extraerMensajeError(e?.response?.data)
  } finally {
    descargando.value = false
  }
}
</script>