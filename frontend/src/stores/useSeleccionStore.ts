import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSeleccionStore = defineStore('seleccion', () => {
  // ---------- Curso y semestre ----------
  const curso = ref('0')
  const semestre = ref('0')

  const setCursoSemestre = (nuevoCurso: string, nuevoSemestre: string) => {
    curso.value = nuevoCurso
    semestre.value = nuevoSemestre
  }

  // ---------- Sala seleccionada ----------
  const nombreSala = ref('')
  const idSalaUsuario = ref(0)
  const idProfesor = ref(0)

  const setSala = (nombre: string, idSalaUsuarioNuevo: number, idProfesorNuevo = 0) => {
    nombreSala.value = nombre
    idSalaUsuario.value = idSalaUsuarioNuevo
    idProfesor.value = idProfesorNuevo
  }

  // ---------- Empresa seleccionada ----------
  const idEmpresa = ref(0)
  const nombreEmpresa = ref('')

  const setEmpresa = (id: number, nombre: string) => {
    idEmpresa.value = id
    nombreEmpresa.value = nombre
  }

  // ---------- Reset (útil al desloguear o cambiar de sala) ----------
  const reset = () => {
    curso.value = '0'
    semestre.value = '0'
    nombreSala.value = ''
    idSalaUsuario.value = 0
    idProfesor.value = 0
    idEmpresa.value = 0
    nombreEmpresa.value = ''
  }

  return {
    curso, semestre, setCursoSemestre,
    nombreSala, idSalaUsuario, idProfesor, setSala,
    idEmpresa, nombreEmpresa, setEmpresa,
    reset
  }
},{
  persist: true
})