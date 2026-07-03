import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSesionStore = defineStore('sesion', () => {
  const token = ref('')
  const idUsuario = ref(0)
  const nombre = ref('')
  const idRol = ref(0) // 1 = admin, 2 = profesor, 3 = alumno

  const setSesion = (datos: { token: string; idUsuario: number; nombre: string; idRol: number }) => {
    token.value = datos.token
    idUsuario.value = datos.idUsuario
    nombre.value = datos.nombre
    idRol.value = datos.idRol
  }

  const cerrarSesion = () => {
    token.value = ''
    idUsuario.value = 0
    nombre.value = ''
    idRol.value = 0
  }

  return { token, idUsuario, nombre, idRol, setSesion, cerrarSesion }
}, {
  persist: true // guarda este store en localStorage automáticamente
})