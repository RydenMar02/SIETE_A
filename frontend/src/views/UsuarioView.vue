<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <div class="flex flex-1">
      <Siderbar />
      <main class="flex-1 min-w-0 overflow-auto bg-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
  <div class="flex flex-wrap justify-between gap-4 mb-6"><div><h1 class="text-2xl font-semibold">Gestión de usuarios</h1><p class="text-slate-500">Profesores y alumnos del sistema.</p></div><button class="bg-green-700 text-white rounded-lg px-4 py-2" @click="nuevo = true">Nuevo usuario</button></div>
  <div class="bg-white p-4 rounded-xl border mb-5 flex flex-wrap gap-4">
    <label class="flex-1 min-w-48">Buscar<input v-model="busqueda" type="search" placeholder="Nombre, cédula o correo" class="block border rounded-lg p-2 w-full"></label>
    <label>Rol<select v-model="rol" class="block border rounded-lg p-2"><option value="">Todos</option><option value="1">Administrador</option><option value="2">Profesor</option><option value="3">Alumno</option></select></label>
    <label>Estado<select v-model="estado" class="block border rounded-lg p-2"><option value="">Todos</option><option value="1">Activo</option><option value="0">Inactivo</option></select></label>
    <button :disabled="cargando" class="text-green-700 disabled:opacity-50" @click="cargar">Actualizar</button>
  </div>
  <p v-if="cargando" role="status">Cargando usuarios...</p>
  <p v-else-if="error" role="alert" class="text-red-700">{{ error }} <button class="underline" @click="cargar">Reintentar</button></p>
  <div v-else class="bg-white border rounded-xl overflow-x-auto">
    <table class="w-full text-sm text-left"><thead class="bg-slate-50"><tr><th v-for="columna in columnas" :key="columna" class="p-3">{{ columna }}</th></tr></thead>
      <tbody><tr v-for="usuario in filtrados" :key="usuario.id_usuario" class="border-t">
        <td class="p-3">{{ usuario.nombre }}</td><td class="p-3">{{ usuario.cedula }}</td><td class="p-3">{{ usuario.correo }}</td><td class="p-3">{{ usuario.telefono }}</td><td class="p-3">{{ roles[usuario.id_rol] ?? 'Desconocido' }}</td><td class="p-3">{{ Number(usuario.estado) === 1 ? 'Activo' : 'Inactivo' }}</td>
        <td class="p-3"><button v-if="[2,3].includes(usuario.id_rol)" :disabled="restableciendo !== null" class="text-green-700 underline disabled:opacity-50" @click="resetPassword(usuario)">{{ restableciendo === usuario.id_usuario ? 'Restableciendo...' : 'Restablecer contraseña' }}</button><span v-else>—</span></td>
      </tr><tr v-if="!filtrados.length"><td colspan="7" class="p-8 text-center text-slate-500">No se encontraron usuarios.</td></tr></tbody>
    </table>
  </div>
  <NuevoUsuarioModal v-if="nuevo" @cerrar="nuevo = false" @creado="creado" />
        </div>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'

import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import Swal from 'sweetalert2'
import NuevoUsuarioModal from '@/components/NuevoUsuarioModal.vue'
import { listarUsuarios, restablecerPassword, type UsuarioAdmin } from '@/services/usuarioService'
import { useAlertas } from '@/composables/useAlertas'
const { makeToast } = useAlertas()
const columnas = ['Nombre', 'Cédula', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Acciones']
const roles: Record<number, string> = { 1: 'Administrador', 2: 'Profesor', 3: 'Alumno' }
const usuarios = ref<UsuarioAdmin[]>([])
const busqueda = ref('')
const rol = ref('')
const estado = ref('')
const nuevo = ref(false)
const cargando = ref(false)
const error = ref('')
const restableciendo = ref<number | null>(null)
const filtrados = computed(() => usuarios.value.filter(u =>
  (!rol.value || String(u.id_rol) === rol.value) &&
  (!estado.value || String(Number(u.estado)) === estado.value) &&
  [u.nombre, u.cedula, u.correo].some(valor => String(valor ?? '').toLocaleLowerCase().includes(busqueda.value.trim().toLocaleLowerCase()))
))
function mensaje(e: unknown) { return isAxiosError<{ msg?: string }>(e) ? e.response?.data?.msg ?? 'No se pudo completar la solicitud.' : 'No se pudo completar la solicitud.' }
async function cargar() {
  if (cargando.value) return
  cargando.value = true; error.value = ''
  try { usuarios.value = (await listarUsuarios()).data }
  catch (e) { error.value = mensaje(e) }
  finally { cargando.value = false }
}
function creado() { nuevo.value = false; makeToast('Usuario creado.', 'success'); void cargar() }
async function resetPassword(usuario: UsuarioAdmin) {
  if (restableciendo.value !== null) return
  restableciendo.value = usuario.id_usuario
  try {
    const resultado = await Swal.fire({ title: 'Restablecer contraseña', text: '¿Restablecer la contraseña de ' + usuario.nombre + '? La contraseña temporal será: 12345678', icon: 'warning', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Restablecer', confirmButtonColor: '#15803d' })
    if (!resultado.isConfirmed) return
    await restablecerPassword(usuario)
    makeToast('Contraseña restablecida.', 'success')
  } catch (e) { makeToast(mensaje(e), 'error') }
  finally { restableciendo.value = null }
}
onMounted(cargar)
</script>
