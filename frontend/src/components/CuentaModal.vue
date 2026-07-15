<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-6">
    <div class="w-full max-w-4xl max-h-[92vh] bg-slate-700 text-white rounded-xl shadow-2xl p-6 overflow-y-auto">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-2">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>
      <p class="text-slate-300 text-sm mb-4">{{ subtituloModal }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="guardar">

        <!-- Empresa: fila propia, igual que el sistema anterior -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Empresa</label>
          <input :value="nombreEmpresa" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2.5 cursor-not-allowed" />
        </div>

        <!-- Nivel / Grupo / Sub grupo: siempre visibles, se habilitan progresivamente -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div class="sm:col-span-2">
            <label for="nivel" class="block text-sm font-medium mb-1.5">Nivel</label>
            <select id="nivel" v-model="nivel" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option :value="0" disabled>Seleccionar</option>
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <div class="sm:col-span-5">
            <label for="grupo" class="block text-sm font-medium mb-1.5">Grupo</label>
            <select id="grupo" v-model="grupoSeleccionado" :disabled="!habilitarGrupo" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option :value="null" disabled>Seleccionar</option>
              <option v-for="g in grupos" :key="g.id_empresacuenta" :value="g.id_empresacuenta">{{ g.nombre }}</option>
            </select>
          </div>

          <div class="sm:col-span-5">
            <label for="subgrupo" class="block text-sm font-medium mb-1.5">Sub grupo</label>
            <select id="subgrupo" v-model="subgrupoSeleccionado" :disabled="!habilitarSubGrupo" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option :value="null" disabled>Seleccionar</option>
              <option v-for="sg in subGrupos" :key="sg.id_empresacuenta" :value="sg.id_empresacuenta">{{ sg.nombre }}</option>
            </select>
          </div>
        </div>

        <!-- Cuenta principal / Sub cuenta: misma lógica -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="cuentaPrincipal" class="block text-sm font-medium mb-1.5">Cuenta principal</label>
            <select id="cuentaPrincipal" v-model="cuentaPrincipalSeleccionada" :disabled="!habilitarCuentaPrincipal" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option :value="null" disabled>Seleccionar</option>
              <option v-for="cp in cuentasPrincipales" :key="cp.id_empresacuenta" :value="cp.id_empresacuenta">{{ cp.nombre }}</option>
            </select>
          </div>

          <div>
            <label for="subcuenta" class="block text-sm font-medium mb-1.5">Sub cuenta</label>
            <select id="subcuenta" v-model="subcuentaSeleccionada" :disabled="!habilitarSubCuenta" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-200 disabled:text-gray-400 disabled:cursor-not-allowed">
              <option :value="null" disabled>Seleccionar</option>
              <option v-for="sc in subCuentas" :key="sc.id_empresacuenta" :value="sc.id_empresacuenta">{{ sc.nombre }}</option>
            </select>
          </div>
        </div>

        <p class="text-center border-y border-slate-500 py-2 font-semibold">Cargar la nueva cuenta contable</p>

        <!-- Datos de la cuenta -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">Código</label>
            <input :value="codigoGenerado" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2.5 cursor-not-allowed" />
          </div>

          <div class="lg:col-span-2">
            <label for="nombre" class="block text-sm font-medium mb-1.5">Nombre</label>
            <input
              id="nombre"
              v-model="form.nombre"
              type="text"
              maxlength="100"
              placeholder="Nombre"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2"
              :class="errores.nombre ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @blur="errores.nombre = validarNombre(form.nombre)"
            />
            <p v-if="errores.nombre" class="text-red-300 text-xs mt-1">{{ errores.nombre }}</p>
          </div>

          <div>
            <label for="nombreAlternativo" class="block text-sm font-medium mb-1.5">Nombre alternativo</label>
            <input id="nombreAlternativo" v-model="form.nombre_alternativo" type="text" maxlength="100" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label for="naturaleza" class="block text-sm font-medium mb-1.5">Naturaleza</label>
            <select id="naturaleza" v-model="form.naturaleza" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2" :class="errores.naturaleza ? 'ring-2 ring-red-500' : 'focus:ring-green-500'">
              <option value="">Seleccionar</option>
              <option value="ACREEDORA">Acreedora</option>
              <option value="DEUDORA">Deudora</option>
            </select>
          </div>

          <div>
            <label for="asentable" class="block text-sm font-medium mb-1.5">Asentable</label>
            <select id="asentable" v-model="form.asentable" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2" :class="errores.asentable ? 'ring-2 ring-red-500' : 'focus:ring-green-500'">
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label for="moneda" class="block text-sm font-medium mb-1.5">Moneda</label>
            <select id="moneda" v-model="form.moneda" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2" :class="errores.moneda ? 'ring-2 ring-red-500' : 'focus:ring-green-500'">
              <option value="">Seleccionar</option>
              <option value="LOCAL">Local</option>
              <option value="EXTRANJERA">Extranjera</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label for="rubro" class="block text-sm font-medium mb-1.5">Rubro</label>
            <input id="rubro" v-model="form.rubro" type="text" maxlength="100" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div class="lg:col-span-3">
            <label for="descripcion" class="block text-sm font-medium mb-1.5">Descripción</label>
            <input id="descripcion" v-model="form.descripcion" type="text" maxlength="100" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4">
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
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  filtrarCuentasPorNivel,
  obtenerCuentaEmpresaPorId,
  crearCuentaEmpresa,
  modificarCuentaEmpresa,
  type CuentaFiltrada,
  type CuentaEmpresaPayload
} from '@/services/cuentaService'

// ---------- Props ----------
interface CuentaProp {
  id_empresacuenta?: number
  codigo?: string
  nombre?: string
  nombre_alternativo?: string
  naturaleza?: string
  asentable?: string
  moneda?: string
  rubro?: string
  descripcion?: string
  id_padre?: number | null
  nivel?: number
}

const props = defineProps<{
  tituloModal: string
  subtituloModal: string
  cuenta?: CuentaProp
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()

const nombreEmpresa = computed(() => seleccion.nombreEmpresa)
const idEditar = ref<number | null>(props.cuenta?.id_empresacuenta ?? null)

// ---------- Formulario ----------
const form = reactive({
  nombre: props.cuenta?.nombre ?? '',
  nombre_alternativo: props.cuenta?.nombre_alternativo ?? '',
  naturaleza: (props.cuenta?.naturaleza ?? '').toUpperCase(),
  asentable: (props.cuenta?.asentable ?? '').toUpperCase(),
  moneda: (props.cuenta?.moneda ?? '').toUpperCase(),
  rubro: props.cuenta?.rubro ?? '',
  descripcion: props.cuenta?.descripcion ?? ''
})

// ---------- Validación ----------
const validarNombre = (valor: string): string => {
  const nombre = valor.trim().replace(/\s+/g, ' ')
  if (!nombre) return 'Por favor, ingrese el nombre.'
  if (nombre.length < 5) return 'El nombre debe tener al menos 5 caracteres.'
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(\s[A-Za-zÁÉÍÓÚÑáéíóúñ]+)*$/.test(nombre)) return 'Solo se permiten letras y un espacio entre palabras.'
  return ''
}

const errores = reactive({ nombre: '', naturaleza: '', asentable: '', moneda: '' })

const formularioValido = (): boolean => {
  errores.nombre = validarNombre(form.nombre)
  errores.naturaleza = form.naturaleza ? '' : 'Seleccioná la naturaleza.'
  errores.asentable = form.asentable ? '' : 'Seleccioná si es asentable.'
  errores.moneda = form.moneda ? '' : 'Seleccioná la moneda.'

  if (nivel.value === 0) {
    makeToast('Seleccioná el nivel de la cuenta.', 'warning')
    return false
  }
  return !errores.nombre && !errores.naturaleza && !errores.asentable && !errores.moneda
}

// ---------- Jerarquía: nivel, grupo, subgrupo, cuenta principal, subcuenta ----------
const nivel = ref(props.cuenta?.nivel ?? 0)

const grupos = ref<CuentaFiltrada[]>([])
const subGrupos = ref<CuentaFiltrada[]>([])
const cuentasPrincipales = ref<CuentaFiltrada[]>([])
const subCuentas = ref<CuentaFiltrada[]>([])
const subSubCuentas = ref<CuentaFiltrada[]>([])

const grupoSeleccionado = ref<number | null>(null)
const subgrupoSeleccionado = ref<number | null>(null)
const cuentaPrincipalSeleccionada = ref<number | null>(null)
const subcuentaSeleccionada = ref<number | null>(null)
const subsubcuentaSeleccionada = ref<number | null>(null)

// Estos ya no controlan si el <select> existe en el DOM (antes con v-if),
// solo si está habilitado (:disabled) — igual que en el sistema anterior.
const habilitarGrupo = computed(() => nivel.value >= 2)
const habilitarSubGrupo = computed(() => nivel.value >= 3 && !!grupoSeleccionado.value)
const habilitarCuentaPrincipal = computed(() => nivel.value >= 4 && !!subgrupoSeleccionado.value)
const habilitarSubCuenta = computed(() => nivel.value >= 5 && !!cuentaPrincipalSeleccionada.value)
const habilitarSubSubCuenta = computed(() => nivel.value === 5 && !!subcuentaSeleccionada.value)

const cargarGrupos = async () => {
  const { data } = await filtrarCuentasPorNivel(1, seleccion.idEmpresa)
  grupos.value = data.cuentas ?? []
}
const cargarSubGrupos = async (idPadre: number) => {
  const { data } = await filtrarCuentasPorNivel(2, seleccion.idEmpresa, idPadre)
  subGrupos.value = data.cuentas ?? []
}
const cargarCuentasPrincipales = async (idPadre: number) => {
  const { data } = await filtrarCuentasPorNivel(3, seleccion.idEmpresa, idPadre)
  cuentasPrincipales.value = data.cuentas ?? []
}
const cargarSubCuentas = async (idPadre: number) => {
  const { data } = await filtrarCuentasPorNivel(4, seleccion.idEmpresa, idPadre)
  subCuentas.value = data.cuentas ?? []
}
const cargarSubSubCuentas = async (idPadre: number) => {
  const { data } = await filtrarCuentasPorNivel(5, seleccion.idEmpresa, idPadre)
  subSubCuentas.value = data.cuentas ?? []
}

// ---------- Generación automática del código ----------
const codigoGenerado = ref(props.cuenta?.codigo ?? '')
const idPadreGuardado = ref<number | null>(props.cuenta?.id_padre ?? null)

const generarCodigo = async (nivelActual: number) => {
  try {
    if (nivelActual === 1) {
      const { data } = await filtrarCuentasPorNivel(1, seleccion.idEmpresa)
      const codigos = (data.cuentas as CuentaFiltrada[])
        .map((c) => parseInt(c.codigo))
        .filter((n) => !isNaN(n))
      codigoGenerado.value = String(Math.max(...codigos, 0) + 1)
      return
    }

    const idPadrePorNivel: Record<number, number | null> = {
      2: grupoSeleccionado.value,
      3: subgrupoSeleccionado.value,
      4: cuentaPrincipalSeleccionada.value,
      5: subcuentaSeleccionada.value
    }
    const idPadre = idPadrePorNivel[nivelActual]
    if (!idPadre) return

    const { data: padre } = await obtenerCuentaEmpresaPorId(idPadre)
    const { data: hijosRes } = await filtrarCuentasPorNivel(nivelActual, seleccion.idEmpresa, idPadre)
    const hijos: CuentaFiltrada[] = hijosRes.cuentas ?? []

    let mayor = 0
    hijos.forEach((hijo) => {
      const ultimo = parseInt(hijo.codigo.split('.').at(-1) ?? '')
      if (!isNaN(ultimo) && ultimo > mayor) mayor = ultimo
    })

    codigoGenerado.value = `${padre.codigo}.${mayor + 1}`
    idPadreGuardado.value = idPadre
  } catch (error) {
    console.error('Error generando código:', error)
    codigoGenerado.value = ''
  }
}

watch(nivel, async (nuevoNivel) => {
  grupoSeleccionado.value = null
  subgrupoSeleccionado.value = null
  cuentaPrincipalSeleccionada.value = null
  subcuentaSeleccionada.value = null
  subsubcuentaSeleccionada.value = null
  codigoGenerado.value = ''
  if (nuevoNivel >= 1) await cargarGrupos()
  await generarCodigo(nivel.value)
})

watch(grupoSeleccionado, async (nuevoGrupo) => {
  subgrupoSeleccionado.value = null
  if (habilitarSubGrupo.value && nuevoGrupo !== null) await cargarSubGrupos(nuevoGrupo)
  await generarCodigo(nivel.value)
  if (subGrupos.value.length === 0 && nivel.value === 3) await generarCodigo(2)
})

watch(subgrupoSeleccionado, async (nuevoSubGrupo) => {
  cuentaPrincipalSeleccionada.value = null
  if (habilitarCuentaPrincipal.value && nuevoSubGrupo !== null) await cargarCuentasPrincipales(nuevoSubGrupo)
  await generarCodigo(nivel.value)
  if (cuentasPrincipales.value.length === 0 && nivel.value === 4) await generarCodigo(3)
})

watch(cuentaPrincipalSeleccionada, async (nuevoCp) => {
  subcuentaSeleccionada.value = null
  if (habilitarSubCuenta.value && nuevoCp !== null) await cargarSubCuentas(nuevoCp)
  await generarCodigo(nivel.value)
  if (subCuentas.value.length === 0 && nivel.value === 3) await generarCodigo(2)
})

watch(subcuentaSeleccionada, async (nuevaSc) => {
  subsubcuentaSeleccionada.value = null
  if (habilitarSubSubCuenta.value && nuevaSc !== null) await cargarSubSubCuentas(nuevaSc)
  await generarCodigo(nivel.value)
})

// ---------- Cerrar modal ----------
const pedirCerrar = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      makeToast('La acción ha sido cancelada.', 'success')
      emit('cerrar')
    }
  })
}

// ---------- Guardar / modificar ----------
const guardar = async () => {
  if (!formularioValido()) {
    makeToast('Por favor corrija los campos marcados.', 'warning')
    return
  }

  const payload: CuentaEmpresaPayload = {
    nombre: form.nombre,
    nombre_alternativo: form.nombre_alternativo,
    codigo: codigoGenerado.value,
    asentable: form.asentable,
    naturaleza: form.naturaleza,
    moneda: form.moneda,
    id_padre: idPadreGuardado.value ?? null,
    nivel: nivel.value,
    estado: true,
    pordefecto: false,
    id_empresa: seleccion.idEmpresa
  }

  try {
    if (idEditar.value) {
      await modificarCuentaEmpresa(idEditar.value, payload)
      makeToast('La cuenta se actualizó correctamente.', 'success')
    } else {
      await crearCuentaEmpresa(payload)
      makeToast('La cuenta se guardó correctamente.', 'success')
    }
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo guardar la cuenta.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

onMounted(() => {
  if (nivel.value >= 1) cargarGrupos()
})
</script>