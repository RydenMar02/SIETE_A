<template>
  <section class="min-h-screen flex items-center bg-slate-100">
    <div class="max-w-5xl mx-auto px-6 py-12 w-full">
      <div class="grid md:grid-cols-2 gap-8 items-center">

        <!-- Texto -->
        <div class="text-center md:text-left">
          <h1 class="text-4xl font-bold text-gray-900 leading-tight">
            Acceso denegado al<br />
            <span class="text-blue-600">sistema SIETE</span>
          </h1>
          <p class="text-lg text-gray-600 mt-4">
            Usted no está autorizado para acceder al sistema.
          </p>
          <p class="text-red-600 font-semibold mt-2">
            {{ segundosMensaje }}
          </p>
        </div>

        <!-- Imágenes -->
        <div class="flex flex-col items-center gap-4">
          <img src="../assets/logoConta432x432.png" alt="Logo Conta" class=" max-w-50 w-full object-contain" />
          <img src="../assets/fcea75px.png" alt="Logo FCEA" class="max-w-50 w-full object-contain" />
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const SEGUNDOS_INICIALES = 16
const segundos = ref(SEGUNDOS_INICIALES)
const segundosMensaje = ref(`En ${SEGUNDOS_INICIALES} segundos será redirigido...`)

let intervalo: ReturnType<typeof setInterval> | undefined

const iniciarTemporizador = () => {
  intervalo = setInterval(() => {
    segundos.value--

    if (segundos.value <= 0) {
      detenerTemporizador()
      router.push('/')
      return
    }

    segundosMensaje.value = `En ${segundos.value} segundos será redirigido...`
  }, 1000)
}

const detenerTemporizador = () => {
  if (intervalo) {
    clearInterval(intervalo)
    intervalo = undefined
  }
}

onMounted(iniciarTemporizador)

// Evita que el timer siga corriendo (y dispare un router.push de un
// componente ya desmontado) si el usuario navega antes de que termine.
onUnmounted(detenerTemporizador)
</script>