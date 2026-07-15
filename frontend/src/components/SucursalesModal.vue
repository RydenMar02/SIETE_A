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

          <!-- Código -->
          <div>
            <label for="codigo" class="block text-sm font-medium mb-1.5">Código</label>
            <input
              id="codigo"
              v-model="form.codigo"
              type="text"
              placeholder="Ej: 001"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.codigo ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @input="form.codigo = form.codigo.replace(/[^0-9-]/g, '')"
              @blur="errores.codigo = validarCodigo(form.codigo)"
            />
            <p v-if="errores.codigo" class="text-red-300 text-xs mt-1">{{ errores.codigo }}</p>
          </div>

          <!-- Nombre -->
          <div>
            <label for="nombre" class="block text-sm font-medium mb-1.5">Nombre de la sucursal</label>
            <input
              id="nombre"
              v-model="form.nombre"
              type="text"
              placeholder="Ingrese el nombre de la sucursal"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.nombre ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.nombre = validarNombre(form.nombre)"
            />
            <p v-if="errores.nombre" class="text-red-300 text-xs mt-1">{{ errores.nombre }}</p>
          </div>

          <!-- Teléfono -->
          <div>
            <label for="telefono" class="block text-sm font-medium mb-1.5">Teléfono</label>
            <input
              id="telefono"
              v-model="form.telefono"
              type="text"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.telefono ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.telefono = validarTelefono(form.telefono)"
            />
            <p v-if="errores.telefono" class="text-red-300 text-xs mt-1">{{ errores.telefono }}</p>
          </div>

          <!-- Responsable -->
          <div>
            <label for="responsable" class="block text-sm font-medium mb-1.5">Responsable</label>
            <input
              id="responsable"
              v-model="form.responsable"
              type="text"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.responsable ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.responsable = validarResponsable(form.responsable)"
            />
            <p v-if="errores.responsable" class="text-red-300 text-xs mt-1">{{ errores.responsable }}</p>
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-1">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
            {{ esModificacion ? 'Modificar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, computed } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  crearSucursal,
  modificarSucursal,
  obtenerSucursales,
  type SucursalPayload,
  type SucursalDetalle
} from '@/services/sucursalService'

// ---------- Props ----------
const props = defineProps<{
  tituloModal: string
  subtituloModal: string
  sucursal?: SucursalDetalle
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

const esModificacion = computed(() => !!props.sucursal?.id_sucursal)

// ---------- Formulario ----------
const form = reactive({
  codigo: props.sucursal?.codigo ?? '',
  nombre: props.sucursal?.nombre ?? '',
  telefono: props.sucursal?.telefono ?? '',
  responsable: props.sucursal?.responsable ?? ''
})

// ---------- Validaciones ----------
const validarNombre = (valor: string): string => {
  const nombre = valor.trim()
  if (!nombre) return 'Por favor ingrese el nombre de la sucursal.'
  if (nombre.length < 3) return 'Debe tener al menos 3 caracteres.'
  if (nombre.length > 100) return 'Máximo 100 caracteres.'
  if (!/^[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ.,&\- ]+$/.test(nombre)) return 'Contiene caracteres inválidos.'
  return ''
}

const validarCodigo = (valor: string): string => {
  if (!valor.trim()) return 'Por favor, ingrese el código de la sucursal.'
  return ''
}

const validarTelefono = (valor: string): string => {
  if (!valor.trim()) return 'Por favor, ingrese el teléfono.'
  return ''
}

const validarResponsable = (valor: string): string => {
  if (!valor.trim()) return 'Por favor, ingrese el responsable.'
  return ''
}

const errores = reactive({ codigo: '', nombre: '', telefono: '', responsable: '' })

const formularioValido = (): boolean => {
  errores.codigo = validarCodigo(form.codigo)
  errores.nombre = validarNombre(form.nombre)
  errores.telefono = validarTelefono(form.telefono)
  errores.responsable = validarResponsable(form.responsable)
  return !errores.codigo && !errores.nombre && !errores.telefono && !errores.responsable
}

// ---------- Evitar sucursales duplicadas ----------
const verificarDuplicados = async (): Promise<{ mismoNombre: boolean; mismaCombinacion: boolean }> => {
  let sucursalesRegistradas: SucursalDetalle[] = []
  try {
    const { data } = await obtenerSucursales(seleccion.idEmpresa)
    sucursalesRegistradas = data.sucursales ?? []
  } catch (error) {
    console.error('Error al obtener sucursales para chequear duplicados:', error)
  }

  const nombreNormalizado = form.nombre.trim().replace(/\s+/g, ' ').toLowerCase()

  const mismoNombre = sucursalesRegistradas.some(
    (s) => (s.nombre || '').trim().replace(/\s+/g, ' ').toLowerCase() === nombreNormalizado
  )
  const mismaCombinacion = sucursalesRegistradas.some(
    (s) =>
      (s.nombre || '').trim().replace(/\s+/g, ' ').toLowerCase() === nombreNormalizado &&
      s.codigo === form.codigo
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

  if (esModificacion.value && props.sucursal) {
    await modificar()
    return
  }

  const { mismaCombinacion, mismoNombre } = await verificarDuplicados()
  if (mismaCombinacion) {
    makeToast('Ya existe una sucursal registrada con el mismo código.', 'error')
    return
  }
  if (mismoNombre) {
    errores.nombre = 'El nombre de la sucursal ya está en uso.'
    makeToast('Ya existe una sucursal registrada con ese nombre.', 'error')
    return
  }
  await guardar()
}

const armarPayload = (): SucursalPayload => ({
  codigo: form.codigo,
  nombre: form.nombre,
  telefono: form.telefono,
  responsable: form.responsable,
  id_empresa: seleccion.idEmpresa,
  estado: true
})

const guardar = async () => {
  try {
    await crearSucursal(armarPayload())
    makeToast('La sucursal se guardó correctamente.', 'success')
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo guardar la sucursal.')
  }
}

const modificar = async () => {
  if (!props.sucursal) return
  try {
    await modificarSucursal(props.sucursal.id_sucursal, armarPayload())
    makeToast('La sucursal se modificó correctamente.', 'success')
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo modificar la sucursal.')
  }
}

// ---------- Manejo de errores ----------
const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}
</script>