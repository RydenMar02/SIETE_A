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
    <p class="bg-amber-50 rounded-lg p-3 mb-5">Funcionalidad pendiente de conexión con backend.</p>
    <p class="text-sm text-slate-500 mb-5">Cuando esté disponible, podrá generar y descargar el archivo .sql. No se ha generado ninguna copia de seguridad.</p>
    <button disabled class="bg-slate-200 rounded-lg px-5 py-3 cursor-not-allowed">Generar backup</button>
  </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
</script>
