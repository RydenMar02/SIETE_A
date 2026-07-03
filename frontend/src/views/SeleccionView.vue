<template>
  <!-- Modales: se mantienen igual que antes, solo se les pasa el estado del paso actual -->
  <ModalSala
    v-if="mostrarModalSala && accionSala === 'crear'"
    :tituloModal="tituloModalSala"
    :mostrarIngresar="false"
    @cerrar="cerrarModalSala"
    @actualizartabla="getSalas"
  />
  <ModalSala
    v-if="mostrarModalSala && accionSala === 'ingresar'"
    :sala="salaSeleccionada"
    :tituloModal="tituloModalSala"
    :mostrarConfirmar="false"
    :mostrarCrear="false"
    :deshabilitarCampos="true"
    @cerrar="cerrarModalSala"
  />
  <ModalEmpresa
    v-if="mostrarModalEmpresa"
    :tituloModal="tituloModalEmpresa"
    :subtituloModal="subtituloModalEmpresa"
    @cerrar="mostrarModalEmpresa = false"
    @actualizartabla="getEmpresas"
  />

  <div class="min-h-screen flex items-center justify-center bg-siete-bg px-4 py-8">
    <div class="w-full max-w-4xl bg-siete-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row">

      <!-- Panel izquierdo: bienvenida + indicador de pasos -->
      <div class="bg-slate-100 flex flex-col items-center justify-center gap-4 px-8 py-10 sm:w-2/5">
        <img src="../assets/logoConta432x432.png" alt="Logo" class="w-28 h-28 object-contain" />
        <div class="text-center">
          <h2 class="text-xl font-bold text-gray-900">Bienvenido</h2>
          <h2 class="text-xl font-bold text-gray-900">{{ nombre }}</h2>
        </div>

        <!-- Indicador de pasos: muestra en qué parte del flujo está el usuario -->
        <ol class="w-full mt-4 space-y-3">
          <li
            v-for="paso in pasos"
            :key="paso.numero"
            class="flex items-center gap-3 text-sm"
            :class="paso.numero === pasoActual ? 'text-gray-900 font-semibold' : 'text-gray-400'"
          >
            <span
              class="w-6 h-6 flex items-center justify-center rounded-full text-xs"
              :class="paso.numero <= pasoActual ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'"
            >
              {{ paso.numero }}
            </span>
            {{ paso.titulo }}
          </li>
        </ol>
      </div>

      <!-- Panel derecho: contenido del paso actual -->
      <div class="flex-1 px-8 py-10 flex flex-col gap-5">

        <!-- PASO 1: Curso y semestre -->
        <form v-if="pasoActual === 1" class="flex flex-col gap-4" @submit.prevent="confirmarCursoSemestre">
          <h3 class="text-white font-semibold mb-1">Seleccioná tu curso y semestre</h3>

          <div>
            <label for="curso" class="block text-sm font-medium text-white mb-1.5">Curso</label>
            <select id="curso" v-model="curso" class="w-full bg-white rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="0">Seleccionar</option>
              <option v-for="n in 5" :key="n" :value="String(n)">{{ n }}</option>
            </select>
          </div>

          <div>
            <label for="semestre" class="block text-sm font-medium text-white mb-1.5">Semestre</label>
            <select id="semestre" v-model="semestre" class="w-full bg-white rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="0">Seleccionar</option>
              <option v-for="n in 10" :key="n" :value="String(n)">{{ n }}</option>
            </select>
          </div>

          <button type="submit" class="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition">
            Continuar
          </button>
        </form>

        <!-- PASO 2: Selección de sala -->
        <div v-else-if="pasoActual === 2" class="flex flex-col gap-4">
          <button
            type="button"
            class="self-start flex items-center gap-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
            @click="pasoActual = 1"
          >
            <i class="ti ti-arrow-left"></i>
            Volver
          </button>

          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Elegí tu sala</h3>
            <button
              v-if="esDocente"
              type="button"
              class="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
              @click="abrirModalCrearSala"
            >
              + Crear sala
            </button>
          </div>

          <p v-if="salas.length === 0" class="text-gray-300 text-sm">
            No hay salas disponibles para este curso y semestre todavía.
          </p>

          <div class="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            <div
              v-for="sala in salas"
              :key="sala.id_sala"
              class="bg-slate-600 rounded-lg p-4 flex flex-col gap-2"
            >
              <p class="text-white font-semibold">{{ sala.sala }}</p>
              <p class="text-sm text-gray-300">Profesor: {{ sala.nombre }}</p>
              <p class="text-xs text-gray-400">ID: {{ sala.id_sala }}</p>
              <div class="flex gap-2 mt-1">
                <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 rounded-md transition" @click="confirmarSeleccionSala(sala)">
                  Seleccionar
                </button>
                <button v-if="esAlumno" class="flex-1 bg-slate-500 hover:bg-slate-400 text-white text-sm font-medium py-1.5 rounded-md transition" @click="abrirModalIngresarSala(sala)">
                  Ingresar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 3: Selección de empresa -->
        <div v-else-if="pasoActual === 3" class="flex flex-col gap-4">
          <button
            type="button"
            class="self-start flex items-center gap-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
            @click="pasoActual = 2"
          >
            <i class="ti ti-arrow-left"></i>
            Volver
          </button>

          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Elegí una empresa</h3>
            <button
              type="button"
              class="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
              @click="abrirModalCrearEmpresa"
            >
              + Crear empresa
            </button>
          </div>

          <p v-if="empresas.length === 0" class="text-gray-300 text-sm">
            Esta sala todavía no tiene empresas cargadas.
          </p>

          <div class="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            <div
              v-for="empresa in empresas"
              :key="empresa.id_empresa"
              class="bg-slate-600 rounded-lg p-4 flex flex-col gap-2"
            >
              <p class="text-white font-semibold">{{ empresa.nombre }}</p>
              <p class="text-xs text-gray-400">ID: {{ empresa.id_empresa }}</p>
              <button class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 rounded-md transition mt-1" @click="confirmarSeleccionEmpresa(empresa)">
                Seleccionar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'

import ModalSala from '@/components/SalaModal.vue'
import ModalEmpresa from '@/components/EmpresaModal.vue'

import {
  obtenerSalasPorCursoSemestre,
  obtenerRelacionSalaUsuario
} from '@/services/salaService'
import { obtenerEmpresasPorSalaUsuario } from '@/services/empresaService'

const router = useRouter()
const { makeToast, makeConfirm } = useAlertas()
const sesion = useSesionStore()
const seleccion = useSeleccionStore()

// ---------- Tipos ----------
// Separar las interfaces deja claro qué forma tiene cada dato que viaja por la vista
interface Sala {
  id_sala: number
  id_salausuario?: number
  sala: string
  nombre: string
  id_profesor?: number
}

interface Empresa {
  id_empresa: number
  nombre: string
}

// ---------- Usuario logueado ----------
const nombre = computed(() => sesion.nombre)
const idUsuario = computed(() => sesion.idUsuario)
const idRol = computed(() => sesion.idRol)

const esDocente = computed(() => idRol.value === 2)
const esAlumno = computed(() => idRol.value === 3)

// ---------- Flujo de pasos ----------
const pasoActual = ref(1)
const pasos = [
  { numero: 1, titulo: 'Curso y semestre' },
  { numero: 2, titulo: 'Sala' },
  { numero: 3, titulo: 'Empresa' }
]

// ---------- Paso 1: Curso y semestre ----------
const curso = ref('0')
const semestre = ref('0')

const confirmarCursoSemestre = () => {
  if (curso.value === '0' || semestre.value === '0') {
    makeToast('Seleccioná un curso y un semestre válidos.', 'warning')
    return
  }
  seleccion.setCursoSemestre(curso.value, semestre.value)
  pasoActual.value = 2
  getSalas()
}

// ---------- Paso 2: Salas ----------
const salas = ref<Sala[]>([])

const getSalas = async () => {
  if (!sesion.token) {
    makeToast('Debés iniciar sesión para continuar.', 'error')
    return
  }

  try {
    const { data } = await obtenerSalasPorCursoSemestre({
      curso: curso.value,
      semestre: semestre.value,
      rol: idRol.value,
      id_usuario: esDocente.value ? idUsuario.value : undefined
    })

    salas.value = (data?.salausuarios ?? []).map((s: any) => ({
      id_sala: s.id_sala,
      id_salausuario: s.id_salausuario,
      sala: s.Sala?.sala ?? 'Desconocido',
      nombre: s.Profesor?.nombre ?? 'Desconocido',
      id_profesor: s.Profesor?.id_usuario ?? null
    }))
  } catch (error) {
    manejarError(error, 'No se pudieron cargar las salas.')
  }
}

const confirmarSeleccionSala = (sala: Sala) => {
  makeConfirm(
    `¿Desea seleccionar esta sala de clase: ${sala.sala}?`,
    'Podrá seleccionar otra clase más adelante.'
  ).then((result) => {
    if (result.isConfirmed) seleccionarSala(sala)
  })
}

const seleccionarSala = async (sala: Sala) => {
  if (!sesion.token) {
    makeToast('Debés iniciar sesión para elegir una sala.', 'error')
    return
  }
  const tipoUsuario = esDocente.value ? 'PROFESOR' : 'ALUMNO'

  try {
    const { data } = await obtenerRelacionSalaUsuario({
      curso: curso.value,
      semestre: semestre.value,
      id_usuario: idUsuario.value,
      id_sala: sala.id_sala,
      tipo: tipoUsuario
    })

    const relacion = data.salaUsuario?.[0]
    if (!relacion) {
      makeToast('No se encontró la relación entre usuario y sala.', 'error')
      return
    }

    seleccion.setSala(sala.sala, relacion.id_salausuario, sala.id_profesor ?? 0)

    makeToast(`Ingresaste a la sala: ${sala.sala}`, 'success')
    pasoActual.value = 3
    getEmpresas()
  } catch (error) {
    manejarError(error, 'No se pudo ingresar a la sala.')
  }
}

// Modal de crear/ingresar sala
const mostrarModalSala = ref(false)
const tituloModalSala = ref('')
const accionSala = ref<'crear' | 'ingresar' | ''>('')
const salaSeleccionada = ref<Sala>({ id_sala: 0, sala: '', nombre: '' })

const abrirModalCrearSala = () => {
  accionSala.value = 'crear'
  tituloModalSala.value = 'Crear Sala'
  mostrarModalSala.value = true
}

const abrirModalIngresarSala = (sala: Sala) => {
  accionSala.value = 'ingresar'
  tituloModalSala.value = 'Ingresar a Sala'
  salaSeleccionada.value = sala
  seleccion.idProfesor = sala.id_profesor ?? 0
  mostrarModalSala.value = true
}

const cerrarModalSala = () => {
  mostrarModalSala.value = false
}

// ---------- Paso 3: Empresas ----------
const empresas = ref<Empresa[]>([])

const getEmpresas = async () => {
  try {
    const { data } = await obtenerEmpresasPorSalaUsuario(seleccion.idSalaUsuario)
    empresas.value = data.empresas ?? []
  } catch (error) {
    manejarError(error, 'No existen empresas en esta sala. Creá una empresa primero.')
  }
}

const confirmarSeleccionEmpresa = (empresa: Empresa) => {
  makeConfirm(
    `¿Desea seleccionar esta empresa: ${empresa.nombre}?`,
    'Podrá seleccionar otra empresa más adelante.'
  ).then((result) => {
    if (!result.isConfirmed) return

    seleccion.setEmpresa(empresa.id_empresa, empresa.nombre)
    makeToast('La empresa ha sido seleccionada.', 'success')
    router.push('/menu')
  })
}

// Modal de crear empresa
const mostrarModalEmpresa = ref(false)
const tituloModalEmpresa = ref('Cargar Nueva Empresa')
const subtituloModalEmpresa = ref('Ingrese todos los datos de la empresa')

const abrirModalCrearEmpresa = () => {
  mostrarModalEmpresa.value = true
}

// ---------- Manejo de errores centralizado ----------
const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as { response?: { data?: { msg?: string } } }
    makeToast(axiosError.response?.data?.msg ?? mensajePorDefecto, 'error')
  } else {
    makeToast(mensajePorDefecto, 'error')
  }
}
</script>