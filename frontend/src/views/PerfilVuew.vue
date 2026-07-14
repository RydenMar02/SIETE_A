<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-gray-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">

          <CambiarContra v-if="mostrarModal" @cerrar="mostrarModal = false" />

          <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
            <h1 class="text-2xl font-semibold text-gray-900">Perfil</h1>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <form class="flex flex-col gap-6" @submit.prevent="modificar">

              <div class="flex flex-col sm:flex-row gap-6 items-start">
                <!-- Ícono -->
                <div class="mx-auto sm:mx-0">
                  <i class="ti ti-user-circle text-gray-300" style="font-size: 140px; line-height: 1;"></i>
                </div>

                <!-- Datos -->
                <div class="flex-1 w-full">
                  <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Detalles del usuario</h2>

                  <p v-if="editMode" class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2 mb-4">
                    <i class="ti ti-pencil mr-1"></i>
                    Estás en modo edición. Los campos están habilitados para modificación.
                  </p>

                  <div class="grid sm:grid-cols-2 gap-4">
                    <!-- Cédula -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">Cédula</label>
                      <input
                        v-model="form.cedula"
                        :disabled="!editMode"
                        type="text"
                        inputmode="numeric"
                        maxlength="10"
                        class="w-full bg-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 disabled:text-gray-500"
                        :class="errores.cedula ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
                        @input="form.cedula = form.cedula.replace(/\D/g, ''); errores.cedula = validarCedula(form.cedula)"
                        @blur="errores.cedula = validarCedula(form.cedula)"
                      />
                      <p v-if="errores.cedula" class="text-red-600 text-xs mt-1">{{ errores.cedula }}</p>
                    </div>

                    <!-- Nombre -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                      <input
                        v-model="form.nombre"
                        :disabled="!editMode"
                        type="text"
                        maxlength="100"
                        class="w-full bg-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 disabled:text-gray-500"
                        :class="errores.nombre ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
                        @input="form.nombre = form.nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, ''); errores.nombre = validarNombre(form.nombre)"
                        @blur="errores.nombre = validarNombre(form.nombre)"
                      />
                      <p v-if="errores.nombre" class="text-red-600 text-xs mt-1">{{ errores.nombre }}</p>
                    </div>

                    <!-- Rol -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                      <input :value="rolLabel" readonly type="text" class="w-full bg-gray-100 text-gray-500 rounded-lg px-3 py-2.5 cursor-not-allowed" />
                    </div>

                    <!-- Teléfono -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                      <input
                        v-model="form.telefono"
                        :disabled="!editMode"
                        type="text"
                        maxlength="15"
                        class="w-full bg-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 disabled:text-gray-500"
                        :class="errores.telefono ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
                        @input="form.telefono = form.telefono.replace(/\D/g, ''); errores.telefono = validarTelefono(form.telefono)"
                        @blur="errores.telefono = validarTelefono(form.telefono)"
                      />
                      <p v-if="errores.telefono" class="text-red-600 text-xs mt-1">{{ errores.telefono }}</p>
                    </div>

                    <!-- Correo -->
                    <div class="sm:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-1.5">Correo</label>
                      <input
                        v-model="form.correo"
                        :disabled="!editMode"
                        type="email"
                        class="w-full bg-gray-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 disabled:text-gray-500"
                        :class="errores.correo ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
                        @input="errores.correo = validarCorreo(form.correo)"
                        @blur="errores.correo = validarCorreo(form.correo)"
                      />
                      <p v-if="errores.correo" class="text-red-600 text-xs mt-1">{{ errores.correo }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <hr class="border-gray-100" />

              <!-- Botones -->
              <div class="flex justify-end gap-3">
                <template v-if="!editMode">
                  <button type="button" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="habilitarEdicion">
                    Modificar perfil
                  </button>
                  <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition" @click="mostrarModal = true">
                    Cambiar contraseña
                  </button>
                </template>
                <template v-else>
                  <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
                    Guardar cambios
                  </button>
                  <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="cancelarEdicion">
                    Cancelar
                  </button>
                </template>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSesionStore } from '@/stores/useSesionStore'
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'
//import CambiarContra from '@/components/ChangePassword.vue'
import { obtenerUsuario, modificarUsuario, type UsuarioPayload } from '@/services/usuarioService'


const { makeToast, makeConfirm } = useAlertas()
const sesion = useSesionStore()

const NOMBRES_ROL: Record<number, string> = { 1: 'Administrador', 2: 'Profesor', 3: 'Alumno' }
const rolLabel = computed(() => NOMBRES_ROL[sesion.idRol] ?? 'Desconocido')

// ---------- Formulario ----------
const form = reactive({ cedula: '', nombre: '', telefono: '', correo: '' })

const cargarPerfil = async () => {
  try {
    const { data } = await obtenerUsuario(sesion.idUsuario)
    form.cedula = data.cedula ?? ''
    form.nombre = data.nombre ?? ''
    form.telefono = data.telefono ?? ''
    form.correo = data.correo ?? ''
  } catch (error) {
    manejarError(error, 'No se pudieron cargar los datos del perfil.')
  }
}

// ---------- Modo edición ----------
const editMode = ref(false)
// Antes "Cancelar" solo apagaba el modo edición sin restaurar los campos
// editados. Guardamos una copia al entrar en edición y la restauramos al
// cancelar, en vez de volver a pedirle los datos al backend.
let snapshot = { ...form }

const habilitarEdicion = () => {
  snapshot = { ...form }
  editMode.value = true
}

const cancelarEdicion = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      Object.assign(form, snapshot)
      errores.cedula = ''
      errores.nombre = ''
      errores.telefono = ''
      errores.correo = ''
      editMode.value = false
      makeToast('La acción ha sido cancelada.', 'success')
    }
  })
}

// ---------- Validaciones ----------
const validarCedula = (valor: string): string => {
  const ced = valor.trim()
  if (!ced) return 'Por favor, ingrese el número de cédula.'
  if (!/^\d{6,10}$/.test(ced)) return 'La cédula debe contener entre 6 y 10 dígitos numéricos.'
  return ''
}

const validarNombre = (valor: string): string => {
  const nomb = valor.trim().replace(/\s+/g, ' ')
  if (!nomb) return 'Por favor, ingrese el nombre.'
  if (nomb.length < 5) return 'El nombre debe tener al menos 5 caracteres.'
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ ]+$/.test(nomb)) return 'Solo se permiten letras.'
  return ''
}

const validarTelefono = (valor: string): string => {
  const tel = valor.trim()
  if (!tel) return 'Por favor, ingrese el número de teléfono.'
  if (!/^\d{8,15}$/.test(tel)) return 'El teléfono debe contener entre 8 y 15 dígitos.'
  return ''
}

const validarCorreo = (valor: string): string => {
  const corr = valor.trim()
  if (!corr) return 'Por favor, ingrese el correo.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corr)) return 'Formato de correo inválido.'
  return ''
}

const errores = reactive({ cedula: '', nombre: '', telefono: '', correo: '' })

const formularioValido = (): boolean => {
  errores.cedula = validarCedula(form.cedula)
  errores.nombre = validarNombre(form.nombre)
  errores.telefono = validarTelefono(form.telefono)
  errores.correo = validarCorreo(form.correo)
  return !errores.cedula && !errores.nombre && !errores.telefono && !errores.correo
}

// ---------- Guardar ----------
const modificar = async () => {
  if (!formularioValido()) {
    makeToast('Por favor corrija los campos marcados.', 'warning')
    return
  }

  const payload: UsuarioPayload = {
    nombre: form.nombre,
    cedula: form.cedula,
    correo: form.correo.toLowerCase(),
    telefono: form.telefono,
    id_rol: sesion.idRol,
    estado: true
  }

  try {
    await modificarUsuario(sesion.idUsuario, payload)

    // El nombre se usa en Navbar/Sidebar vía el store de sesión — se
    // actualiza ahí también para que se refleje sin recargar la página.
    sesion.setSesion({
      token: sesion.token,
      idUsuario: sesion.idUsuario,
      nombre: form.nombre,
      idRol: sesion.idRol
    })

    editMode.value = false
    makeToast('El usuario se modificó correctamente.', 'success')
  } catch (error) {
    manejarError(error, 'No se pudo modificar los datos del usuario.')
  }
}

// ---------- Cambio de contraseña ----------
const mostrarModal = ref(false)

// ---------- Errores ----------
const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

onMounted(cargarPerfil)
</script>