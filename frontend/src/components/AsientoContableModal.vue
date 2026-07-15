<template>
  <ModalCuentaEmpresa v-if="mostrarSelectorCuenta" @cerrarEmpresacuenta="mostrarSelectorCuenta = false" @seleccionar="onSeleccionarCuenta" />

  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2 py-4">
    <div class="w-full max-w-6xl h-[95vh] bg-slate-700 text-white rounded-xl shadow-2xl p-6 overflow-y-auto">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="guardarAsiento">
        <p class="text-center border-y border-slate-500 py-2 font-semibold">Cargar datos del asiento</p>

        <!-- Cabecera -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1.5">Sucursal</label>
            <select v-model="idSucursalSeleccionada" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option :value="null" disabled>Seleccionar</option>
              <option v-for="s in sucursales" :key="s.id_sucursal" :value="s.id_sucursal">{{ s.nombre || 'Sin nombre' }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Tipo de asiento</label>
            <select v-model="tipoAsiento" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar</option>
              <option value="MANUAL">MANUAL</option>
              <option value="COMPRA">COMPRA</option>
              <option value="VENTA">VENTA</option>
              <option value="AJUSTE">AJUSTE</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">N° asiento</label>
            <input :value="numeroAsiento" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 cursor-not-allowed" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Fecha</label>
            <input :value="fechaVisible" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Concepto</label>
          <input
            v-model="concepto"
            type="text"
            class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
            :class="errores.concepto ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
            @blur="errores.concepto = validarConcepto(concepto)"
          />
          <p v-if="errores.concepto" class="text-red-300 text-xs mt-1">{{ errores.concepto }}</p>
        </div>

        <p class="text-center border-y border-slate-500 py-2 font-semibold">Cargar datos de la cuenta contable</p>

        <!-- Fila de carga de un renglón -->
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <div>
            <label class="block text-sm font-medium mb-1.5">Código</label>
            <input
              v-model="codigo"
              type="text"
              inputmode="numeric"
              maxlength="30"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              :class="errores.codigo ? 'ring-2 ring-red-500' : 'focus:ring-green-500'"
              @input="codigo = codigo.replace(/[^0-9.]/g, '')"
              @blur="onValidarCodigo"
            />
          </div>

          <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2 flex items-center justify-center h-fit" @click="mostrarSelectorCuenta = true">
            <i class="ti ti-search text-lg"></i>
          </button>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1.5">Cuenta</label>
            <input :value="nombreCuenta" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 cursor-not-allowed" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Debe</label>
            <input
              v-model="debe"
              type="text"
              inputmode="numeric"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-green-500"
              @input="debe = formatearInputImporte(debe)"
            />
          </div>

          <div class="flex gap-2">
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1.5">Haber</label>
              <input
                v-model="haber"
                type="text"
                inputmode="numeric"
                class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                @input="haber = formatearInputImporte(haber)"
              />
            </div>
            <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 h-fit py-2" @click="agregarRenglon">
              <i class="ti ti-plus text-lg"></i>
            </button>
          </div>
        </div>
        <p v-if="errores.codigo" class="text-red-300 text-xs -mt-2">{{ errores.codigo }}</p>

        <!-- Tabla de renglones cargados -->
        <div class="bg-white rounded-lg overflow-hidden">
          <div class="max-h-64 overflow-y-auto">
            <table class="w-full text-sm text-gray-900">
              <thead class="sticky top-0 bg-slate-200">
                <tr>
                  <th class="text-left px-3 py-2">N°</th>
                  <th class="text-left px-3 py-2">Código</th>
                  <th class="text-left px-3 py-2">Cuenta</th>
                  <th class="text-right px-3 py-2">Debe</th>
                  <th class="text-right px-3 py-2">Haber</th>
                  <th class="text-center px-3 py-2">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in renglones" :key="item.id" class="border-t border-gray-100">
                  <td class="px-3 py-2">{{ item.id }}</td>
                  <td class="px-3 py-2">{{ item.codigo }}</td>
                  <td class="px-3 py-2">{{ item.nombre }}</td>
                  <td class="px-3 py-2 text-right">{{ formatearImporte(item.debe) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatearImporte(item.haber) }}</td>
                  <td class="px-3 py-2 text-center">
                    <button type="button" class="text-red-600 hover:text-red-800" @click="eliminarRenglon(item)">
                      <i class="ti ti-trash text-lg"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="renglones.length === 0">
                  <td colspan="6" class="text-center text-gray-400 py-6">Todavía no cargaste ninguna cuenta</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totales -->
        <div class="grid grid-cols-3 gap-3 max-w-md ml-auto">
          <div>
            <label class="block text-sm font-medium mb-1.5">Diferencia</label>
            <input :value="formatearImporte(diferencia)" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 text-right cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Total debe</label>
            <input :value="formatearImporte(totalDebe)" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 text-right cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Total haber</label>
            <input :value="formatearImporte(totalHaber)" readonly type="text" class="w-full bg-slate-600 text-slate-300 rounded-lg px-3 py-2 text-right cursor-not-allowed" />
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4">
          <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition" @click="tipoAsiento = 'Compra'">
            Compra
          </button>
          <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg transition" @click="tipoAsiento = 'Venta'">
            Venta
          </button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
            Registrar
          </button>
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { formatearImporte, parsearImporte, toNumberSafe } from '@/composables/useFacturaCalculo'
import ModalCuentaEmpresa from '@/components/CuentaEmpresaModal.vue'
import { obtenerSucursales, type Sucursal } from '@/services/sucursalService'
import { validarCuentaPorCodigo, type CuentaAplanada } from '@/services/cuentaService'
import { crearAsiento, obtenerUltimoAsiento, type AsientoDetallePayload } from '@/services/asientoService'

defineProps<{ tituloModal: string }>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm } = useAlertas()
const seleccion = useSeleccionStore()


// ---------- Sucursales ----------
const sucursales = ref<Sucursal[]>([])
const idSucursalSeleccionada = ref<number | null>(null)

const cargarSucursales = async () => {
  try {
    const { data } = await obtenerSucursales(seleccion.idEmpresa)
    sucursales.value = data.sucursales ?? []
  } catch (error) {
    console.error(error)
    makeToast('Error al conseguir las sucursales.', 'error')
  }
}

// ---------- Cabecera ----------
const tipoAsiento = ref('')
const concepto = ref('')
const numeroAsiento = ref('')
const fechaVisible = ref('')
const fechaISO = ref('')

const cargarFecha = () => {
  const hoy = new Date()
  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()
  fechaVisible.value = `${dia}-${mes}-${anio}`
  fechaISO.value = `${anio}-${mes}-${dia}`
}

const cargarNumeroAsiento = async () => {
  try {
    const { data } = await obtenerUltimoAsiento(seleccion.idEmpresa)
    const ultimo = data?.asientos?.[0]?.numero_asiento ?? 'A-00000'
    const match = /^([A-Z])-(\d{5})$/.exec(ultimo)
    const prefijo = match ? match[1] : 'A'
    const numero = (parseInt(match ? match[2] : '0', 10) + 1).toString().padStart(5, '0')
    numeroAsiento.value = `${prefijo}-${numero}`
  } catch (error) {
    console.error('Error al obtener número de asiento:', error)
    makeToast('Error al obtener el número de asiento.', 'error')
    numeroAsiento.value = 'A-00001'
  }
}

const validarConcepto = (valor: string): string => {
  const texto = valor.trim()
  if (!texto) return 'Por favor, ingrese el concepto.'
  if (texto.length < 5 || texto.length > 100) return 'El concepto debe tener entre 5 y 100 caracteres.'
  return ''
}

// ---------- Carga de un renglón (código + cuenta + debe/haber) ----------
const codigo = ref('')
const nombreCuenta = ref('')
const idEmpresaCuentaSeleccionada = ref<number | null>(null)
const debe = ref('')
const haber = ref('')

const errores = ref({ concepto: '', codigo: '' })

const formatearInputImporte = (valor: string): string => {
  const numero = parsearImporte(valor)
  return numero === null ? valor : formatearImporte(numero)
}

const onValidarCodigo = async () => {
  errores.value.codigo = await validarCodigo()
}

const validarCodigo = async (): Promise<string> => {
  const cod = codigo.value.trim()
  if (!cod) {
    nombreCuenta.value = ''
    idEmpresaCuentaSeleccionada.value = null
    return ''
  }
  if (renglones.value.some((r) => r.codigo === cod)) {
    return 'Este código ya fue agregado.'
  }
  try {
    const { data } = await validarCuentaPorCodigo(cod, seleccion.idEmpresa)
    nombreCuenta.value = data.cuenta?.nombre ?? data.nombre ?? ''
    idEmpresaCuentaSeleccionada.value = data.id_empresacuenta ?? null
    return ''
  } catch (error) {
    nombreCuenta.value = ''
    idEmpresaCuentaSeleccionada.value = null
    return 'Código inválido o cuenta no encontrada.'
  }
}

// ---------- Selector de cuenta (panel lateral) ----------
// Antes este panel se abría pero no estaba conectado a nada — clickear una
// cuenta ahí no completaba el campo Código. Ahora sí: al seleccionar, se
// completa el código y se dispara la misma validación que si se hubiera
// tipeado a mano.
const mostrarSelectorCuenta = ref(false)

const onSeleccionarCuenta = async (cuenta: CuentaAplanada) => {
  codigo.value = cuenta.codigo
  errores.value.codigo = await validarCodigo()
}

// ---------- Renglones (líneas del asiento) ----------
interface Renglon {
  id: number
  idempresaCuenta: number
  codigo: string
  nombre: string
  debe: number
  haber: number
}

const renglones = ref<Renglon[]>([])
let contadorRenglon = 1

const agregarRenglon = () => {
  const debeNumero = toNumberSafe(debe.value) ?? 0
  const haberNumero = toNumberSafe(haber.value) ?? 0

  if (!codigo.value || !nombreCuenta.value || (!debeNumero && !haberNumero)) {
    makeToast('Completá el código de cuenta y al menos un importe (Debe o Haber).', 'warning')
    return
  }

  renglones.value.push({
    id: contadorRenglon++,
    idempresaCuenta: idEmpresaCuentaSeleccionada.value ?? 0,
    codigo: codigo.value,
    nombre: nombreCuenta.value,
    debe: debeNumero,
    haber: haberNumero
  })

  codigo.value = ''
  nombreCuenta.value = ''
  debe.value = ''
  haber.value = ''
  idEmpresaCuentaSeleccionada.value = null
  errores.value.codigo = ''
}

const eliminarRenglon = (item: Renglon) => {
  renglones.value = renglones.value.filter((r) => r.id !== item.id)
}

// Antes los totales se calculaban bien pero se escribían con manipulación
// directa del DOM (document.getElementById(...).value = ...), sin tocar
// los refs reales — quedaban desincronizados con lo que Vue realmente sabe.
// Con computed, el total siempre refleja el estado real de `renglones`.
const totalDebe = computed(() => renglones.value.reduce((acc, r) => acc + r.debe, 0))
const totalHaber = computed(() => renglones.value.reduce((acc, r) => acc + r.haber, 0))
const diferencia = computed(() => totalDebe.value - totalHaber.value)

// ---------- Cerrar modal ----------
const pedirCerrar = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      makeToast('La acción ha sido cancelada.', 'success')
      emit('cerrar')
    }
  })
}

// ---------- Guardar ----------
const guardarAsiento = async () => {
  errores.value.concepto = validarConcepto(concepto.value)
  if (errores.value.concepto) {
    makeToast('Por favor corrija los campos marcados.', 'warning')
    return
  }
  if (!idSucursalSeleccionada.value) {
    makeToast('Seleccioná una sucursal.', 'warning')
    return
  }
  if (!tipoAsiento.value) {
    makeToast('Seleccioná el tipo de asiento.', 'warning')
    return
  }
  if (renglones.value.length === 0) {
    makeToast('Agregá al menos una cuenta al asiento.', 'warning')
    return
  }
  if (diferencia.value !== 0) {
    const confirmar = await makeConfirm(
      'El asiento no está balanceado (Debe ≠ Haber).',
      '¿Deseás registrarlo de todas formas?'
    )
    if (!confirmar.isConfirmed) return
  }

  const detalles: AsientoDetallePayload[] = renglones.value.map((r) => ({
    id_empresacuenta: r.idempresaCuenta,
    debe: r.debe,
    haber: r.haber
  }))

  try {
    await crearAsiento({
      id_empresa: seleccion.idEmpresa,
      id_sucursal: idSucursalSeleccionada.value,
      tipo_asiento: tipoAsiento.value.toUpperCase() as 'MANUAL' | 'COMPRA' | 'VENTA' | 'AJUSTE',
      documento: '',
      total_debe: totalDebe.value,
      total_haber: totalHaber.value,
      diferencia: diferencia.value,
      numero_asiento: numeroAsiento.value,
      fecha: fechaISO.value,
      concepto: concepto.value,
      asientoDetalles: detalles
    })

    makeToast('El asiento fue registrado correctamente.', 'success')
    renglones.value = []
    concepto.value = ''
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, 'No se pudo registrar el asiento.')
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  const mensaje = data?.errors?.[0]?.msg ?? data?.msg ?? mensajePorDefecto
  makeToast(mensaje, 'error')
}

onMounted(() => {
  cargarFecha()
  cargarSucursales()
  cargarNumeroAsiento()
})
</script>