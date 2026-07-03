<template>
  <div class="min-h-screen flex items-center justify-center bg-siete-bg px-4 py-8">
    <div class="w-full max-w-3xl bg-siete-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row">

      <!-- Panel del logo -->
      <div class="bg-siete-light flex flex-col items-center justify-center gap-4 px-8 py-10 sm:w-2/5">
        <img src="../assets/logoConta432x432.png" alt="Logo SIETE" class="w-32 h-32 object-contain" />
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p class="text-sm text-gray-600 mt-2 leading-relaxed">
            Al Sistema Integrado de Educación, Tecnología y Estados Contables
          </p>
        </div>
      </div>

      <!-- Panel del formulario -->
      <form class="flex-1 px-8 py-10 flex flex-col justify-center gap-5" @submit.prevent="login">
        <div>
          <label for="cedula" class="block text-sm font-semibold text-white mb-1.5">Cédula</label>
          <input
            id="cedula"
            v-model="cedula"
            type="text"
            inputmode="numeric"
            placeholder="Cédula"
            class="w-full bg-white rounded-lg border-0 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-semibold text-white mb-1.5">Contraseña</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Ingrese su contraseña"
              class="w-full bg-white rounded-lg border-0 px-4 py-2.5 pr-11 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'ti ti-eye-off' : 'ti ti-eye'" class="text-lg"></i>
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-white cursor-pointer select-none">
          <input
            v-model="recordarme"
            type="checkbox"
            class="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Recordarme
        </label>

        <button
          type="submit"
          :disabled="cargando"
          class="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-md"
        >
          {{ cargando ? 'Ingresando...' : 'Iniciar Sesión' }}
        </button>

        <router-link to="/changePass" class="text-center text-sm text-blue-300 hover:text-blue-200 underline">
          Olvidé mi contraseña
        </router-link>
      </form>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import { login as loginRequest } from '@/services/authService'

const router = useRouter()
const { makeAlert } = useAlertas()
const sesion = useSesionStore()

const cedula = ref('')
const password = ref('')
const showPassword = ref(false)
const recordarme = ref(false)
const cargando = ref(false)

const login = async () => {
  if (!cedula.value || !password.value) {
    makeAlert('Faltan datos', 'Ingresá tu cédula y contraseña.', 'warning')
    return
  }

  cargando.value = true
  try {
    const { data } = await loginRequest({ cedula: cedula.value, contra: password.value })

    sesion.setSesion({
      token: data.token,
      idUsuario: data.usuario.id_usuario,
      nombre: data.usuario.nombre,
      idRol: data.usuario.id_rol
    })

    await makeAlert('¡Éxito!', 'Has iniciado sesión correctamente.', 'success')
    router.push('/seleccion')
  } catch (error) {
    console.error('Error al iniciar sesión:', error)
    makeAlert('Error', 'Cédula o contraseña incorrectos.', 'error')
  } finally {
    cargando.value = false
  }
}
</script>