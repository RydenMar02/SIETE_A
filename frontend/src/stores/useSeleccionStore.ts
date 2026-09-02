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
  // id_sala (no id_salausuario): hace falta aparte porque varios endpoints
  // que ya existen en el backend (listar/crear ejercicios) trabajan por
  // id_sala, no por id_salausuario. Se completa en el mismo momento en que
  // se selecciona/ingresa a la sala (ver SeleccionView y SalaModal).
  const idSala = ref(0)
  const idProfesor = ref(0)

  const setSala = (nombre: string, idSalaUsuarioNuevo: number, idSalaNuevo: number, idProfesorNuevo = 0) => {
    nombreSala.value = nombre
    idSalaUsuario.value = idSalaUsuarioNuevo
    idSala.value = idSalaNuevo
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
    idSala.value = 0
    idProfesor.value = 0
    idEmpresa.value = 0
    nombreEmpresa.value = ''
  }

  return {
    curso, semestre, setCursoSemestre,
    nombreSala, idSalaUsuario, idSala, idProfesor, setSala,
    idEmpresa, nombreEmpresa, setEmpresa,
    reset
  }
},{
  persist: true
})