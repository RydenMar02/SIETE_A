<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="w-full max-w-2xl bg-slate-700 text-white rounded-xl shadow-2xl p-6">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-2">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>
      <p class="text-slate-300 text-sm mb-4">{{ subtituloModal }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="guardarOModificar">
        <div class="grid sm:grid-cols-2 gap-4">

          <!-- Nombre de la empresa -->
          <div class="sm:col-span-2">
            <label for="nombre" class="block text-sm font-medium mb-1.5">Nombre de la empresa</label>
            <input
              id="nombre"
              v-model="form.nombre"
              type="text"
              placeholder="Ingrese el nombre de la empresa"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.nombre ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.nombre = validarNombreEmpresa(form.nombre)"
            />
            <p v-if="errores.nombre" class="text-red-300 text-xs mt-1">{{ errores.nombre }}</p>
          </div>

          <!-- RUC -->
          <div>
            <label for="ruc" class="block text-sm font-medium mb-1.5">RUC</label>
            <input
              id="ruc"
              v-model="form.ruc"
              type="text"
              placeholder="Ej: 1111111-1"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.ruc ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @input="form.ruc = form.ruc.replace(/[^0-9-]/g, '')"
              @blur="errores.ruc = validarRuc(form.ruc)"
            />
            <p v-if="errores.ruc" class="text-red-300 text-xs mt-1">{{ errores.ruc }}</p>
          </div>

          <!-- Sigla -->
          <div>
            <label for="sigla" class="block text-sm font-medium mb-1.5">Sigla</label>
            <input
              id="sigla"
              v-model="form.sigla"
              type="text"
              placeholder="Ej: S.A."
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.sigla ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.sigla = validarSigla(form.sigla)"
            />
            <p v-if="errores.sigla" class="text-red-300 text-xs mt-1">{{ errores.sigla }}</p>
          </div>

          <!-- Período fiscal: ya no se elige acá. La empresa usa el
               ejercicio activo de su sala (se crea junto con la sala), así
               que esto es solo informativo. -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1.5">Período fiscal</label>

            <div v-if="cargandoEjercicio" class="text-slate-300 text-sm px-3 py-2.5">
              Buscando el ejercicio activo de la sala...
            </div>

            <div v-else-if="ejercicioActivo" class="bg-slate-600 text-slate-100 rounded-lg px-3 py-2.5">
              {{ ejercicioActivo.nombre }}
              <span class="text-slate-300 text-xs block">
                {{ ejercicioActivo.fecha_inicio }} a {{ ejercicioActivo.fecha_fin }}
              </span>
            </div>

            <div v-else-if="!seleccion.idSala" class="bg-yellow-900/40 text-yellow-200 text-sm rounded-lg px-3 py-2.5">
              No se pudo identificar la sala de esta sesión. Salí y volvé a seleccionar la sala para continuar.
            </div>

            <div v-else class="bg-red-900/40 text-red-200 text-sm rounded-lg px-3 py-2.5">
              Esta sala todavía no tiene un ejercicio activo. Pedile al profesor que cree uno antes de cargar una empresa.
            </div>
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-1">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!esModificacion && !cargandoEjercicio && !ejercicioActivo"
            class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
          >
            {{ esModificacion ? 'Modificar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  crearEmpresa,
  modificarEmpresa,
  obtenerEmpresas,
  type EmpresaPayload,
  type Empresa
} from '@/services/empresaService'
import { obtenerEjerciciosPorSala, type Ejercicio } from '@/services/ejercicioService'

// ---------- Props ----------
const props = defineProps<{
  tituloModal: string
  subtituloModal: string
  empresa?: Empresa
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

const esModificacion = computed(() => !!props.empresa?.id_empresa)

// ---------- Formulario ----------
const form = reactive({
  nombre: props.empresa?.nombre ?? '',
  ruc: props.empresa?.ruc ?? '',
  sigla: props.empresa?.sigla ?? ''
})

// ---------- Validaciones ----------
// Funciones puras, igual que en ModalCrearsala: reciben el valor y devuelven
// el mensaje de error. Reusables en cualquier otro formulario de empresa.
const validarNombreEmpresa = (valor: string): string => {
  const nombre = valor.trim()
  if (!nombre) return 'Por favor ingrese el nombre de la empresa.'
  if (nombre.length < 3) return 'Debe tener al menos 3 caracteres.'
  if (nombre.length > 100) return 'Máximo 100 caracteres.'
  if (!/^[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ.,&\- ]+$/.test(nombre)) return 'Contiene caracteres inválidos.'
  return ''
}

const validarSigla = (valor: string): string => {
  if (!valor) return 'Por favor, ingrese la sigla.'
  const sigla = valor.toUpperCase().replace(/\s+/g, '').replace(/\.{2,}/g, '.').replace(/(^\.|\.$)/g, '')
  if (!sigla) return 'Por favor, ingrese la sigla.'
  if (!/^([A-Z]\.){1,6}$/.test(sigla + '.')) {
    return 'Formato inválido. Debe ser letras mayúsculas seguidas de punto. Ej: S.A.'
  }
  return ''
}

const validarRuc = (valor: string): string => {
  if (!valor) return 'Por favor, ingrese el número de RUC.'
  if (!/^\d{6,10}-\d{1,2}$/.test(valor)) return 'Formato de RUC inválido. Debe ser: 1234567-8'
  return ''
}

const errores = reactive({ nombre: '', ruc: '', sigla: '' })

const formularioValido = (): boolean => {
  errores.nombre = validarNombreEmpresa(form.nombre)
  errores.ruc = validarRuc(form.ruc)
  errores.sigla = validarSigla(form.sigla)
  return !errores.nombre && !errores.ruc && !errores.sigla
}

// Normaliza sigla y ruc antes de guardar (la sigla, por ejemplo, se guarda con punto final)
const normalizarFormulario = () => {
  form.sigla = form.sigla.toUpperCase().replace(/\s+/g, '').replace(/\.{2,}/g, '.').replace(/(^\.|\.$)/g, '') + '.'
}

// ---------- Evitar empresas duplicadas ----------
const verificarDuplicados = async (): Promise<{ mismoNombre: boolean; mismaCombinacion: boolean }> => {
  let empresasRegistradas: Empresa[] = []
  try {
    const { data } = await obtenerEmpresas()
    empresasRegistradas = data.empresas ?? []
  } catch (error) {
    console.error('Error al obtener empresas para chequear duplicados:', error)
  }

  const nombreNormalizado = form.nombre.trim().replace(/\s+/g, ' ').toLowerCase()
  const siglaNormalizada = form.sigla.trim().toUpperCase()

  const mismoNombre = empresasRegistradas.some(
    (e) => (e.nombre || '').trim().replace(/\s+/g, ' ').toLowerCase() === nombreNormalizado
  )

  const mismaCombinacion = empresasRegistradas.some(
    (e) =>
      (e.nombre || '').trim().replace(/\s+/g, ' ').toLowerCase() === nombreNormalizado &&
      (e.sigla || '').trim().toUpperCase() === siglaNormalizada
  )

  return { mismoNombre, mismaCombinacion }
}

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
  normalizarFormulario()

  if (esModificacion.value && props.empresa) {
    await modificar()
    return
  }

  if (!ejercicioActivo.value) {
    makeToast('Esta sala todavía no tiene un ejercicio activo, no se puede crear la empresa.', 'error')
    return
  }

  const { mismaCombinacion, mismoNombre } = await verificarDuplicados()
  if (mismaCombinacion) {
    makeToast('Ya existe una empresa registrada con la misma sigla y período.', 'error')
    return
  }
  if (mismoNombre) {
    errores.nombre = 'El nombre de la empresa ya está en uso.'
    makeToast('Ya existe una empresa registrada con ese nombre.', 'error')
    return
  }
  await guardar()
}

const armarPayload = (): EmpresaPayload => ({
  nombre: form.nombre,
  ruc: form.ruc,
  sigla: form.sigla,
  id_salausuario: seleccion.idSalaUsuario,
  estado: true
})

const guardar = async () => {
  try {
    await crearEmpresa(armarPayload())
    makeToast('La empresa se guardó correctamente.', 'success')
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo guardar la empresa.')
  }
}

const modificar = async () => {
  if (!props.empresa) return
  try {
    await modificarEmpresa(props.empresa.id_empresa, armarPayload())
    makeToast('La empresa se modificó correctamente.', 'success')
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo modificar la empresa.')
  }
}

// ---------- Ejercicio activo de la sala (informativo, ya no se elige) ----------
// No existe un endpoint que devuelva "el ejercicio activo" directo: se pide
// el listado completo de ejercicios de la sala (ya viene ordenado por fecha
// descendente) y se toma el primero que esté ABIERTO, del lado del cliente.
const ejercicioActivo = ref<Ejercicio | null>(null)
const cargandoEjercicio = ref(true)

const cargarEjercicioActivo = async () => {
  cargandoEjercicio.value = true
  try {
    if (!seleccion.idSala) {
      // Sesión vieja (de antes de que el store guardara id_sala): no hay
      // forma de resolverlo sin volver a pasar por la selección de sala.
      ejercicioActivo.value = null
      return
    }
    const { data } = await obtenerEjerciciosPorSala(seleccion.idSala)
    const ejercicios: Ejercicio[] = data?.ejercicios ?? []
    ejercicioActivo.value = ejercicios.find((e) => e.estado === 'ABIERTO') ?? null
  } catch (error) {
    ejercicioActivo.value = null
    console.error(error)
  } finally {
    cargandoEjercicio.value = false
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
  cargarEjercicioActivo()
})
</script>