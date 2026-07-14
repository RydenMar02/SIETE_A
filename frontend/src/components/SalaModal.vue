<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="w-full max-w-md bg-slate-700 text-white rounded-xl shadow-2xl p-6">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent>

        <!-- Profesor -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Profesor</label>
          <input
            :value="nombreProfesor"
            readonly
            type="text"
            class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2.5 cursor-not-allowed"
          />
        </div>

        <!-- Nombre de la sala -->
        <div>
          <label for="nombreSala" class="block text-sm font-medium mb-1.5">Nombre de la sala</label>
          <input
            id="nombreSala"
            v-model="form.sala"
            :disabled="deshabilitarCampos"
            type="text"
            maxlength="50"
            placeholder="Ingrese el nombre"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
            :class="errores.sala ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
            @input="form.sala = form.sala.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, ''); errores.sala = validarNombreSala(form.sala)"
            @blur="errores.sala = validarNombreSala(form.sala)"
          />
          <p v-if="errores.sala" class="text-red-300 text-xs mt-1">{{ errores.sala }}</p>
        </div>

        <!-- Curso -->
        <div>
          <label for="curso" class="block text-sm font-medium mb-1.5">Curso</label>
          <select id="curso" v-model="form.curso" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="" disabled>Seleccionar</option>
              <option v-for="c in CUSRO" :key="c" :value="c">
                {{ ETIQUETAS_CURSO[c] }}
              </option>
          </select>
        </div>

        <!-- Semestre -->
        <div>
          <label for="semestre" class="block text-sm font-medium mb-1.5">Semestre</label>
          <select id="semestre" v-model="form.semestre" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="" disabled>Seleccionar</option>
              <option v-for="s in SEMESTRE" :key="s" :value="s">
                {{ ETIQUETAS_SEMESTRE[s] }}
              </option>
          </select>
        </div>

        <!-- Contraseña -->
        <div>
          <label for="password" class="block text-sm font-medium mb-1.5">Contraseña</label>
          <input
            id="password"
            v-model="form.contra"
            type="password"
            maxlength="50"
            placeholder="Ingrese una contraseña"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
            :class="errores.password ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
            @input="errores.password = validarContraNueva(form.contra)"
            @blur="errores.password = validarContraNueva(form.contra)"
          />
          <p v-if="errores.password" class="text-red-300 text-xs mt-1">{{ errores.password }}</p>
        </div>

        <!-- Confirmar contraseña -->
        <div v-if="mostrarConfirmar">
          <label for="confirmPassword" class="block text-sm font-medium mb-1.5">Confirmar Contraseña</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            maxlength="50"
            placeholder="Repita la contraseña"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
            :class="errores.confirmPassword ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
            @input="errores.confirmPassword = validarContraRepetida(confirmPassword, form.contra)"
            @blur="errores.confirmPassword = validarContraRepetida(confirmPassword, form.contra)"
          />
          <p v-if="errores.confirmPassword" class="text-red-300 text-xs mt-1">{{ errores.confirmPassword }}</p>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-1">
          <button
            v-if="mostrarCrear"
            type="button"
            class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition"
            @click="guardarOModificar"
          >
            {{ esModificacion ? 'Modificar' : 'Crear' }}
          </button>

          <button
            v-if="mostrarIngresar"
            type="button"
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
            @click="ingresar"
          >
            Ingresar
          </button>

          <button
            type="button"
            class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition"
            @click="pedirCerrar"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  crearSala,
  modificarSala,
  obtenerSala,
  ingresarASala,
  type SalaPayload
} from '@/services/salaService'
import {
  CUSRO,
  ETIQUETAS_CURSO,
  ETIQUETAS_SEMESTRE,
  SEMESTRE,
  type curso,
  type semestre
} from '@/services/cursoSemestreService'

// ---------- Props ----------
interface SalaProp {
  id_sala: number
  sala: string
  nombre: string
  id_docente?: number
}

const props = withDefaults(defineProps<{
  tituloModal: string
  mostrarConfirmar?: boolean
  mostrarCrear?: boolean
  mostrarIngresar?: boolean
  deshabilitarCampos?: boolean
  sala?: SalaProp
}>(), {
  mostrarConfirmar: true,
  mostrarCrear: true,
  mostrarIngresar: true,
  deshabilitarCampos: false
})

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const sesion = useSesionStore()
const seleccion = useSeleccionStore()

const esModificacion = computed(() => !!props.sala?.id_sala)

// ---------- Formulario ----------
const form = reactive({
  sala: props.sala?.sala ?? '',
  curso: '' as curso | '',
  semestre: '' as semestre | '',
  contra: ''
})
const confirmPassword = ref('')

// ---------- Validaciones ----------
// Funciones puras: reciben el valor y devuelven el mensaje de error (o '').
// Al no depender de refs internas, son fáciles de reusar en otros formularios
// de contraseña (ej. el modal de usuario) sin copiar y pegar.
const validarNombreSala = (valor: string): string => {
  const nombre = valor.trim().replace(/\s+/g, ' ')
  if (!nombre) return 'Por favor, ingrese el nombre.'
  if (nombre.length < 5) return 'El nombre debe tener al menos 5 caracteres.'
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ ]+$/.test(nombre)) return 'Solo se permiten letras.'
  return ''
}

const validarContraNueva = (valor: string): string => {
  if (!valor) return 'La contraseña es obligatoria.'
  if (valor.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(valor)) return 'Debe tener al menos una letra mayúscula.'
  if (!/[0-9]/.test(valor)) return 'Debe tener al menos un número.'
  return ''
}

const validarContraRepetida = (repetida: string, original: string): string => {
  if (!repetida) return 'Debe repetir la contraseña.'
  if (repetida !== original) return 'Las contraseñas no coinciden.'
  return ''
}

const errores = reactive({ sala: '', password: '', confirmPassword: '' })

const formularioValido = (): boolean => {
  errores.sala = validarNombreSala(form.sala)
  errores.password = validarContraNueva(form.contra)
  errores.confirmPassword = props.mostrarConfirmar
    ? validarContraRepetida(confirmPassword.value, form.contra)
    : ''
  return !errores.sala && !errores.password && !errores.confirmPassword
}

// ---------- Nombre del profesor ----------
const nombreProfesor = computed(() =>
  sesion.idRol === 2 ? sesion.nombre : (props.sala?.nombre ?? '')
)

// ---------- Cerrar modal (con confirmación) ----------
const pedirCerrar = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      makeToast('La acción ha sido cancelada.', 'success')
      emit('cerrar')
    }
  })
}

// ---------- Guardar / modificar ----------
const guardarOModificar = async () => {
  if (!formularioValido()) {
    makeToast('Por favor corrija los campos marcados.', 'warning')
    return
  }

  const payload: SalaPayload = {
    sala: form.sala,
    contra: form.contra,
    curso: form.curso,
    semestre: form.semestre,
    id_usuario: sesion.idUsuario,
    estado: true
  }

  try {
    if (esModificacion.value && props.sala) {
      await modificarSala(props.sala.id_sala, payload)
      makeToast('La sala se modificó correctamente.', 'success')
    } else {
      await crearSala(payload)
      makeToast('La sala se guardó correctamente.', 'success')
    }
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, esModificacion.value ? 'No se pudo modificar la sala.' : 'No se pudo crear la sala.')
  }
}

// ---------- Ingresar a una sala existente ----------
const ingresar = async () => {
  if (!props.sala) return

  try {
    const { data } = await obtenerSala(props.sala.id_sala)
    const contraCorrecta: string | undefined = data.contra ?? data.dataValues?.contra

    if (contraCorrecta?.trim() !== form.contra.trim()) {
      makeToast('La contraseña ingresada no coincide con la de la sala.', 'error')
      return
    }

    const { data: resultado } = await ingresarASala({
      id_sala: props.sala.id_sala,
      contrasena: form.contra,
      tipo: 'ALUMNO',
      id_alumno: sesion.idUsuario,
      id_profesor: seleccion.idProfesor,
      baja: true,
      estado: true
    })

    if (resultado.id_salausuario) {
      seleccion.setSala(props.sala.sala, resultado.id_salausuario, seleccion.idProfesor)
    }

    makeToast('Ingreso a la sala exitoso.', 'success')
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo ingresar a la sala. Verifique la contraseña e intente nuevamente.')
    
  }
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

onMounted(() => {
  if (props.sala) {
    form.sala = props.sala.sala
  }
})
</script>