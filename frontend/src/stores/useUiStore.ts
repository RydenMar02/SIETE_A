import { defineStore } from 'pinia'
import { ref } from 'vue'

// Este store es distinto a los otros dos: no guarda datos de negocio
// (usuario, sala, empresa), guarda estado de la interfaz. Por eso no
// necesita persist: true — tiene sentido que la sidebar empiece cerrada
// en mobile cada vez que se recarga la página.
export const useUiStore = defineStore('ui', () => {
  const sidebarAbierta = ref(false)

  const toggleSidebar = () => {
    sidebarAbierta.value = !sidebarAbierta.value
  }

  const cerrarSidebar = () => {
    sidebarAbierta.value = false
  }

  return { sidebarAbierta, toggleSidebar, cerrarSidebar }
})