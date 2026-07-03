<template>
  <header class="sticky top-0 z-20 bg-white shadow flex items-center justify-between px-3 py-2 md:px-4">

    <!-- Logo + botón de sidebar (mobile) -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="md:hidden p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menú lateral"
        @click="$emit('toggle-sidebar')"
      >
        <Icon icon="mdi:menu" width="24" />
      </button>

      <router-link to="/menu" class="flex items-center px-2">
        <img src="../assets/logoConta432x432.png" alt="Logo" width="40" />
      </router-link>
    </div>

    <!-- Enlaces: pantallas md en adelante -->
    <nav class="hidden md:flex items-center gap-1">
      <span class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700">
        <Icon icon="mdi:account-tag-outline" width="20" />
        {{ rolLabel }}
      </span>

      <router-link to="/profile" class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition">
        <Icon icon="mdi:account-circle-outline" width="20" />
        Perfil
      </router-link>

      <a href="#" class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition">
        <Icon icon="mdi:bell-outline" width="20" />
        Notificaciones
      </a>

      <button
        type="button"
        class="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
        @click="logout"
      >
        <Icon icon="mdi:logout" width="20" />
        Salir
      </button>
    </nav>

    <!-- Menú: pantallas chicas -->
    <div class="md:hidden relative">
      <button
        type="button"
        class="p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menú de usuario"
        @click="mostrarMenuMovil = !mostrarMenuMovil"
      >
        <Icon icon="mdi:dots-vertical" width="24" />
      </button>

      <!-- Cierra el menú si tocás afuera -->
      <div v-if="mostrarMenuMovil" class="fixed inset-0 z-10" @click="mostrarMenuMovil = false"></div>

      <div
        v-if="mostrarMenuMovil"
        class="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20"
      >
        <span class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700">
          <Icon icon="mdi:account-tag-outline" width="20" />
          {{ rolLabel }}
        </span>

        <router-link
          to="/profile"
          class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          @click="mostrarMenuMovil = false"
        >
          <Icon icon="mdi:account-circle-outline" width="20" />
          Perfil
        </router-link>

        <a href="#" class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
          <Icon icon="mdi:bell-outline" width="20" />
          Notificaciones
        </a>

        <button
          type="button"
          class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          @click="logout"
        >
          <Icon icon="mdi:logout" width="20" />
          Salir
        </button>
      </div>
    </div>

  </header>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'

defineEmits<{ (e: 'toggle-sidebar'): void }>()

const router = useRouter()
const sesion = useSesionStore()
const seleccion = useSeleccionStore()

const mostrarMenuMovil = ref(false)

// El rol ya está disponible directo en el store de sesión (idRol),
const NOMBRES_ROL: Record<number, string> = {
  1: 'ADMINISTRADOR',
  2: 'PROFESOR',
  3: 'ALUMNO'
}
const rolLabel = computed(() => NOMBRES_ROL[sesion.idRol] ?? 'Desconocido')

const logout = () => {
  sesion.cerrarSesion()
  seleccion.reset()
  mostrarMenuMovil.value = false
  router.push('/')
}
</script>