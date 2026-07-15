<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
    <div class="w-full max-w-2xl bg-slate-700 text-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-2">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>
      <p class="text-slate-300 text-sm mb-4">{{ subtituloModal }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="guardar">
        <div class="grid sm:grid-cols-2 gap-4">

          <!-- Tipo documento -->
          <div>
            <label for="tipoDocumento" class="block text-sm font-medium mb-1.5">Tipo documento</label>
            <select id="tipoDocumento" v-model="form.tipo_documento" required class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="" disabled>Seleccionar</option>
              <option v-for="td in TIPOS_DOCUMENTO" :key="td" :value="td">
                {{ ETIQUETAS_TIPO_DOCUMENTO[td] }}
              </option>
            </select>
          </div>

          <!-- Tipo contribuyente -->
          <div>
            <label for="tipoContribuyente" class="block text-sm font-medium mb-1.5">Tipo contribuyente</label>
            <select id="tipoContribuyente" v-model="form.tipo_contribuyente" required class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="" disabled>Seleccionar</option>
              <option v-for="tc in TIPOS_CONTRIBUYENTE" :key="tc" :value="tc">
                {{ ETIQUETAS_TIPO_CONTRIBUYENTE[tc] }}
              </option>
            </select>
          </div>

          <!-- N° identificación -->
          <div>
            <label for="numeroIdentificacion" class="block text-sm font-medium mb-1.5">N° identificación</label>
            <input id="numeroIdentificacion" v-model="form.numero_identificacion" type="text" maxlength="15" required placeholder="Ingrese el número de identificación" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <!-- Razón social -->
          <div>
            <label for="razonSocial" class="block text-sm font-medium mb-1.5">Razón social</label>
            <input id="razonSocial" v-model="form.razon_social" type="text" maxlength="50" required placeholder="Ingrese la razón social" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <!-- Teléfono -->
          <div>
            <label for="telefono" class="block text-sm font-medium mb-1.5">N° de teléfono</label>
            <input id="telefono" v-model="form.telefono" type="text" maxlength="20" required placeholder="Ingrese el número" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <!-- Correo -->
          <div>
            <label for="correo" class="block text-sm font-medium mb-1.5">Correo</label>
            <input id="correo" v-model="form.correo" type="email" maxlength="50" required placeholder="Ingrese el correo" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <!-- Dirección -->
          <div>
            <label for="direccion" class="block text-sm font-medium mb-1.5">Dirección</label>
            <input id="direccion" v-model="form.direccion" type="text" maxlength="100" required placeholder="Ingrese la dirección" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <!-- Ciudad -->
          <div>
            <label for="ciudad" class="block text-sm font-medium mb-1.5">Ciudad</label>
            <select id="ciudad" v-model="form.id_ciudad" required class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option :value="0" disabled>Seleccionar ciudad</option>
              <option v-for="ciudad in ciudades" :key="ciudad.id_ciudad" :value="ciudad.id_ciudad">
                {{ ciudad.nombre }}
              </option>
            </select>
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4 mt-1">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  TIPOS_DOCUMENTO,
  TIPOS_CONTRIBUYENTE,
  ETIQUETAS_TIPO_DOCUMENTO,
  ETIQUETAS_TIPO_CONTRIBUYENTE,
  obtenerCiudades,
  type TipoDocumento,
  type TipoContribuyente,
  type Ciudad
} from '@/services/catalogoService'
import {
  crearClienteProveedor,
  modificarClienteProveedor,
  type TipoClienteProveedor,
  type ClienteProveedorPayload
} from '@/services/clienteProveedorService'

// ---------- Props ----------
// El único diferenciador real entre "modal de cliente" y "modal de proveedor"
// es este prop. Todo lo demás (campos, validaciones, catálogos) es idéntico.
const props = defineProps<{
  tipo: TipoClienteProveedor
  tituloModal: string
  subtituloModal?: string
  itemEditar?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Catálogos ----------
// Documento y contribuyente son enums fijos: no hace falta pedirlos ni
// esperar una respuesta de red para pintar esos dos selects.
const ciudades = ref<Ciudad[]>([])

const cargarCiudades = async () => {
  try {
    const { data } = await obtenerCiudades()
    ciudades.value = data ?? []
  } catch (error) {
    console.error(error)
    makeToast('No se pudieron cargar las ciudades.', 'error')
  }
}

// ---------- Formulario ----------
const form = reactive({
  razon_social: '',
  numero_identificacion: '',
  direccion: '',
  telefono: '',
  correo: '',
  estado: 1,
  tipo_documento: '' as TipoDocumento | '',
  tipo_contribuyente: '' as TipoContribuyente | '',
  id_ciudad: 0
})

const idEditar = ref<number | null>(null)

const cargarDatosDeEdicion = () => {
  if (!props.itemEditar) return

  idEditar.value = props.itemEditar.id_clienteproveedor ?? null
  Object.assign(form, {
    razon_social: props.itemEditar.razon_social ?? '',
    numero_identificacion: props.itemEditar.numero_identificacion ?? '',
    direccion: props.itemEditar.direccion ?? '',
    telefono: props.itemEditar.telefono ?? '',
    correo: props.itemEditar.correo ?? '',
    estado: props.itemEditar.estado ? 1 : 0,
    tipo_documento: props.itemEditar.tipo_documento ?? '',
    tipo_contribuyente: props.itemEditar.tipo_contribuyente ?? '',
    id_ciudad: props.itemEditar.Ciudad?.id_ciudad ?? 0
  })
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

const validarFormatoIdentificacion = (): boolean => {
  const valor = form.numero_identificacion.trim()

  if (form.tipo_documento === 'RUC') {
    // Formato esperado: número-dígito verificador, ej. 5868524-1
    const regexRuc = /^\d+-\d$/
    if (!regexRuc.test(valor)) {
      makeToast('El RUC debe tener el formato número-dígito verificador (ej: 5868524-1).', 'warning')
      return false
    }
  }

  return true
}

// ---------- Guardar / modificar ----------
const guardar = async () => {
  if (!form.tipo_documento || !form.tipo_contribuyente) {
    makeToast('Seleccioná tipo de documento y contribuyente.', 'warning')
    return
  }

   if (!validarFormatoIdentificacion()) return

  const payload: ClienteProveedorPayload = {
    tipo: props.tipo,
    razon_social: form.razon_social.trim(),
    numero_identificacion: form.numero_identificacion.trim(),
    direccion: form.direccion.trim(),
    telefono: form.telefono.trim(),
    correo: form.correo.trim().toLowerCase(),
    estado: form.estado,
    tipo_documento: form.tipo_documento,
    tipo_contribuyente: form.tipo_contribuyente,
    id_ciudad: Number(form.id_ciudad),
    id_empresa: seleccion.idEmpresa
  }

  const etiqueta = props.tipo === 'CLIENTE' ? 'cliente' : 'proveedor'

  try {
    if (idEditar.value) {
      await modificarClienteProveedor(idEditar.value, payload)
      makeToast(`El ${etiqueta} fue actualizado exitosamente.`, 'success')
    } else {
      await crearClienteProveedor(payload)
      makeToast(`El ${etiqueta} fue guardado exitosamente.`, 'success')
    }
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, `No se pudo guardar el ${etiqueta}.`)
  }
}

// ---------- Manejo de errores ----------
// El back a veces devuelve un array de errores de validación (`errors`), a veces
// un `message`, a veces un `msg`. Se prueban en orden en vez de repetir el
// mismo if/else en cada modal que hable con este mismo endpoint.
const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data

  if (Array.isArray(data?.errors)) {
    const mensaje = data.errors.map((e: any) => e.msg ?? e.message ?? e).join(', ')
    makeToast(mensaje, 'error')
  } else {
    makeToast(data?.message ?? data?.msg ?? mensajePorDefecto, 'error')
  }
}

onMounted(async () => {
  await cargarCiudades()
  cargarDatosDeEdicion()
})
</script>