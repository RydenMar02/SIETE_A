<template>
  <ModalCuenta v-if="mostrarModalCuenta" @cerrarEmpresacuenta="mostrarModalCuenta = false" />

  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2 py-4">
    <div class="w-full max-w-6xl h-[95vh] bg-slate-700 text-white rounded-xl shadow-2xl p-6 overflow-y-auto">

      <!-- Título -->
      <div class="flex items-center justify-between border-b border-slate-500 pb-3 mb-4">
        <h2 class="text-xl font-semibold">{{ tituloModal }}</h2>
        <button type="button" class="text-slate-300 hover:text-white" @click="pedirCerrar">
          <i class="ti ti-x text-xl"></i>
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="registrar">
        <p class="text-center border-y border-slate-500 py-2 font-semibold">
          Cargar datos de la Factura {{ tipo === 'COMPRA' ? 'Compra' : 'Venta' }}
        </p>

        <!-- Fila 1 -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1.5">Sucursal</label>
            <select v-model="form.id_sucursal" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option disabled value="0">Seleccionar</option>
              <option v-for="s in sucursales" :key="s.id_sucursal" :value="s.id_sucursal">{{ s.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">{{ tipo === 'COMPRA' ? 'Proveedor' : 'Cliente' }}</label>
            <select v-model="form.idcliente_proveedor" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option disabled value="0">Seleccionar</option>
              <option v-for="p in tercerosDisponibles" :key="p.idcliente_proveedor" :value="p.idcliente_proveedor">
                {{ p.razon_social }} - {{ p.numero_identificacion }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Tipo comprobante</label>
            <select v-model="form.tipo_de_factura" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option disabled value="">Seleccionar</option>
              <option value="FACTURA">FACTURA</option>
              <option value="FACTURA ELECTRONICA">FACTURA ELECTRÓNICA</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Moneda</label>
            <select v-model="form.moneda" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option disabled value="">Seleccionar</option>
              <option value="LOCAL">LOCAL</option>
              <option value="EXTRANJERA">EXTRANJERA</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Condición</label>
            <select v-model="form.condicion" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option disabled value="">Seleccionar</option>
              <option value="CONTADO">CONTADO</option>
              <option value="CREDITO">CRÉDITO</option>
            </select>
          </div>
        </div>

        <!-- Fila 2 -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label class="block text-sm font-medium mb-1.5">Fecha</label>
            <input v-model="form.fecha" type="date" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">N° comprobante</label>
            <input v-model="form.numero_factura" type="text" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">N° timbrado</label>
            <input v-model="form.numero_timbrado" type="text" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Fecha vencimiento</label>
            <input v-model="form.fecha_vencimiento" type="date" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <button type="button" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-2 rounded-lg transition h-fit" @click="mostrarModalCuenta = true">
            Cuentas
          </button>

          <div>
            <label class="block text-sm font-medium mb-1.5">Total factura</label>
            <input
              v-model="form.total_factura"
              type="text"
              inputmode="numeric"
              class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-right font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              @input="form.total_factura = formatearInputImporte(form.total_factura)"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Concepto</label>
          <input v-model="form.concepto" type="text" class="w-full bg-white text-gray-900 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <!-- Detalle de impuestos y cuentas -->
        <div class="bg-slate-300 text-gray-900 rounded-lg p-4">
          <p class="text-center font-semibold mb-3">Detalle de Impuestos y Cuentas Asociadas</p>

          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-slate-600 text-white">
                  <th class="p-2 border border-slate-400">Impuesto</th>
                  <th class="p-2 border border-slate-400">Importe</th>
                  <th class="p-2 border border-slate-400">Base Imponible</th>
                  <th class="p-2 border border-slate-400">IVA</th>
                  <th class="p-2 border border-slate-400">Cuenta Código</th>
                  <th class="p-2 border border-slate-400">Cuenta Nombre</th>
                  <th class="p-2 border border-slate-400">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <!-- Exenta -->
                <tr class="text-center bg-white">
                  <td class="p-2 border border-slate-300 font-medium">Exenta</td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.exenta" type="text" inputmode="numeric" class="w-full text-right border rounded px-2 py-1" @input="onCambiarExenta" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="baseExenta" readonly placeholder="Igual al importe" class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="0" readonly placeholder="Sin IVA" class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.cuenta_exenta" type="text" placeholder="Código" class="w-full text-center border rounded px-2 py-1" @input="validarCodigosCuenta" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="nombreCuentaExenta" readonly placeholder="Nombre de la cuenta" class="w-full border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.descripcion_exenta" type="text" placeholder="Descripción del gasto" class="w-full border rounded px-2 py-1" />
                  </td>
                </tr>

                <!-- IVA 10% -->
                <tr class="text-center bg-white">
                  <td class="p-2 border border-slate-300 font-medium">IVA 10%</td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.gravada10" type="text" inputmode="numeric" class="w-full text-right border rounded px-2 py-1" @input="onCambiarGravada10" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="form.base_imp_iva_10" readonly class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="form.importe_iva_10" readonly class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.cuenta_grav10" type="text" placeholder="Código" class="w-full text-center border rounded px-2 py-1" @input="validarCodigosCuenta" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="nombreCuentaIva10" readonly placeholder="Nombre de la cuenta" class="w-full border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.descripcion_iva10" type="text" placeholder="Descripción del gasto" class="w-full border rounded px-2 py-1" />
                  </td>
                </tr>

                <!-- IVA 5% -->
                <tr class="text-center bg-white">
                  <td class="p-2 border border-slate-300 font-medium">IVA 5%</td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.gravada05" type="text" inputmode="numeric" class="w-full text-right border rounded px-2 py-1" @input="onCambiarGravada05" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="form.base_imp_iva_05" readonly class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="form.importe_iva_05" readonly class="w-full text-right border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.cuenta_grav05" type="text" placeholder="Código" class="w-full text-center border rounded px-2 py-1" @input="validarCodigosCuenta" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input :value="nombreCuentaIva05" readonly placeholder="Nombre de la cuenta" class="w-full border rounded px-2 py-1 bg-slate-100" />
                  </td>
                  <td class="p-2 border border-slate-300">
                    <input v-model="form.descripcion_iva5" type="text" placeholder="Descripción del gasto" class="w-full border rounded px-2 py-1" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totales -->
          <div class="flex flex-wrap justify-end items-center gap-4 mt-3 text-sm font-semibold">
            <p>Exenta: <span class="text-blue-700">{{ form.exenta }}</span></p>
            <p>Gravada 10%: <span class="text-green-700">{{ form.gravada10 }}</span></p>
            <p>IVA 10%: <span class="text-blue-700">{{ form.importe_iva_10 }}</span></p>
            <p>Gravada 5%: <span class="text-green-700">{{ form.gravada05 }}</span></p>
            <p>IVA 5%: <span class="text-blue-700">{{ form.importe_iva_05 }}</span></p>
            <p class="text-lg">Total: <span class="text-green-700">{{ totalFactura }}</span></p>
          </div>
        </div>

        <!-- Pie del modal -->
        <div class="flex justify-end gap-2 border-t border-slate-500 pt-4">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition" @click="pedirCerrar">
            Cancelar
          </button>
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition">
            Registrar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useAlertas } from '@/composables/useAlertas'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import {
  toUpperSafe,
  isEmpty,
  toNumberSafe,
  mustBeNonNegative,
  formatearImporte,
  parsearImporte,
  calcularBaseEIva
} from '@/composables/useFacturaCalculo'

import ModalCuenta from '@/components/CuentaEmpresaModal.vue'
import { obtenerSucursales, type Sucursal } from '@/services/sucursalService'
import { obtenerClientesProveedores, type ClienteProveedorItem } from '@/services/clienteProveedorService'
import { obtenerCuentas, validarCuentaPorCodigo, type Cuenta } from '@/services/cuentaService'
import { crearCompraVenta, modificarCompraVenta, type CompraVentaPayload, type TipoComprobante } from '@/services/compraVentaService'

// ---------- Props ----------
// El único diferenciador real entre "modal de compra" y "modal de venta"
// es este prop: cambia el tipo de tercero (proveedor/cliente) y el valor
// que se manda al backend. Todo el resto del formulario es idéntico.
const props = defineProps<{
  tipo: TipoComprobante
  tituloModal: string
  itemEditar?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'cerrar'): void
  (e: 'actualizartabla'): void
}>()

const { makeToast, makeConfirm, makeAlert } = useAlertas()
const seleccion = useSeleccionStore()

// ---------- Catálogos ----------
const sucursales = ref<Sucursal[]>([])
const tercerosDisponibles = ref<ClienteProveedorItem[]>([])
const cuentas = ref<Cuenta[]>([])

const cargarCatalogos = async () => {
  try {
    const tipoTercero = props.tipo === 'COMPRA' ? 'PROVEEDOR' : 'CLIENTE'
    const [suc, terceros, cuentasRes] = await Promise.all([
      obtenerSucursales(seleccion.idEmpresa),
      obtenerClientesProveedores(tipoTercero, seleccion.idEmpresa),
      obtenerCuentas(seleccion.idEmpresa)
    ])
    sucursales.value = suc.data.sucursales ?? []
    tercerosDisponibles.value = terceros.data.registros ?? []
    cuentas.value = cuentasRes.data.cuentas ?? []
  } catch (error) {
    console.error(error)
    makeToast('No se pudieron cargar los datos iniciales.', 'error')
  }
}

// ---------- Formulario ----------
const form = reactive({
  id_sucursal: '' as number | string,
  idcliente_proveedor: '' as number | string,
  numero_factura: '',
  numero_timbrado: '',
  tipo_de_factura: '',
  condicion: '',
  fecha: '',
  total_factura: '',
  exenta: '',
  base_imp_iva_10: '',
  base_imp_iva_05: '',
  importe_iva_10: '',
  importe_iva_05: '',
  gravada10: '',
  gravada05: '',
  moneda: '',
  concepto: '',
  imputada: '',
  cuenta_exenta: '',
  cuenta_grav10: '',
  cuenta_grav05: '',
  descripcion_exenta: '',
  descripcion_iva10: '',
  descripcion_iva5: '',
  fecha_vencimiento: '',
  idcuenta_exenta: '' as number | string,
  idcuenta_iva10: '' as number | string,
  idcuenta_iva5: '' as number | string
})

const idEditar = ref<number | null>(null)

// ---------- Cuentas: nombres resueltos y modal de ayuda ----------
const nombreCuentaExenta = ref('')
const nombreCuentaIva10 = ref('')
const nombreCuentaIva05 = ref('')
const mostrarModalCuenta = ref(false)

const validarCodigosCuenta = async () => {
  const [exenta, grav10, grav05] = await Promise.all([
    resolverCuenta(form.cuenta_exenta),
    resolverCuenta(form.cuenta_grav10),
    resolverCuenta(form.cuenta_grav05)
  ])

  nombreCuentaExenta.value = exenta?.nombre ?? ''
  nombreCuentaIva10.value = grav10?.nombre ?? ''
  nombreCuentaIva05.value = grav05?.nombre ?? ''

  form.idcuenta_exenta = exenta?.idempresa_cuenta ?? ''
  form.idcuenta_iva10 = grav10?.idempresa_cuenta ?? ''
  form.idcuenta_iva5 = grav05?.idempresa_cuenta ?? ''
}

const resolverCuenta = async (codigo: string): Promise<Cuenta | null> => {
  if (!codigo?.trim()) return null
  try {
    const { data } = await validarCuentaPorCodigo(codigo.trim(), seleccion.idEmpresa)
    if (!data?.idempresa_cuenta) return null
    return { idempresa_cuenta: data.idempresa_cuenta, id_cuenta: data.idcuenta, nombre: data.nombre, codigo: data.codigo }
  } catch (error) {
    console.error(`Error al validar cuenta ${codigo}:`, error)
    return null
  }
}

// ---------- Cálculo de impuestos ----------
const baseExenta = ref('')

const onCambiarExenta = () => {
  const numero = parsearImporte(form.exenta)
  baseExenta.value = numero === null ? '' : formatearImporte(numero)
  form.exenta = numero === null ? form.exenta : formatearImporte(numero)
}

const onCambiarGravada10 = () => {
  const numero = parsearImporte(form.gravada10)
  if (numero === null) {
    form.base_imp_iva_10 = '0'
    form.importe_iva_10 = '0'
    return
  }
  const { base, iva } = calcularBaseEIva(numero, 0.10)
  form.base_imp_iva_10 = formatearImporte(base)
  form.importe_iva_10 = formatearImporte(iva)
  form.gravada10 = formatearImporte(numero)
}

const onCambiarGravada05 = () => {
  const numero = parsearImporte(form.gravada05)
  if (numero === null) {
    form.base_imp_iva_05 = '0'
    form.importe_iva_05 = '0'
    return
  }
  const { base, iva } = calcularBaseEIva(numero, 0.05)
  form.base_imp_iva_05 = formatearImporte(base)
  form.importe_iva_05 = formatearImporte(iva)
  form.gravada05 = formatearImporte(numero)
}

const formatearInputImporte = (valor: string): string => {
  const numero = parsearImporte(valor)
  return numero === null ? valor : formatearImporte(numero)
}

const totalFacturaNumero = computed(() =>
  (toNumberSafe(form.exenta) ?? 0) + (toNumberSafe(form.gravada10) ?? 0) + (toNumberSafe(form.gravada05) ?? 0)
)
const totalFactura = computed(() => formatearImporte(totalFacturaNumero.value))

watch(
  () => [form.gravada10, form.gravada05, form.exenta],
  () => {
    onCambiarGravada10()
    onCambiarGravada05()
    onCambiarExenta()
  },
  { immediate: true }
)

// ---------- Validación previa al envío ----------
const ENUMS = {
  tipoFactura: ['FACTURA', 'FACTURA ELECTRONICA'],
  condicion: ['CONTADO', 'CREDITO'],
  moneda: ['LOCAL', 'EXTRANJERA'],
  imputada: ['SI', 'NO']
}

const validarFormulario = (): { ok: boolean; errores: string[]; advertencias: string[] } => {
  const errores: string[] = []
  const advertencias: string[] = []

  if (!form.id_sucursal) errores.push('Debes seleccionar una sucursal.')
  if (!form.idcliente_proveedor) errores.push(`Debes seleccionar un ${props.tipo === 'COMPRA' ? 'proveedor' : 'cliente'}.`)
  if (isEmpty(form.numero_factura)) errores.push('El N° de comprobante es obligatorio.')
  if (isEmpty(form.tipo_de_factura)) errores.push('Selecciona un tipo de factura.')
  if (isEmpty(form.condicion)) errores.push('Selecciona la condición.')
  if (isEmpty(form.moneda)) errores.push('Selecciona la moneda.')

  if (!ENUMS.tipoFactura.includes(toUpperSafe(form.tipo_de_factura))) errores.push('Tipo de factura inválido.')
  if (!ENUMS.condicion.includes(toUpperSafe(form.condicion))) errores.push('Condición inválida.')
  if (!ENUMS.moneda.includes(toUpperSafe(form.moneda))) errores.push('Moneda inválida.')

  const numericos: Array<[number | null, string]> = [
    [toNumberSafe(form.numero_timbrado), 'N° Timbrado'],
    [toNumberSafe(form.total_factura), 'Total factura'],
    [toNumberSafe(form.exenta), 'Exentas'],
    [toNumberSafe(form.gravada10), 'Gravadas 10'],
    [toNumberSafe(form.gravada05), 'Gravadas 5']
  ]
  for (const [valor, etiqueta] of numericos) {
    if (valor !== null && !mustBeNonNegative(valor)) errores.push(`${etiqueta} no puede ser negativo.`)
  }

  const sumaPartes = (toNumberSafe(form.exenta) ?? 0) + (toNumberSafe(form.gravada10) ?? 0) + (toNumberSafe(form.gravada05) ?? 0)
  const total = toNumberSafe(form.total_factura)
  if (total !== null) {
    if (sumaPartes > total + 1e-6) {
      errores.push('La suma de Exentas + Gravadas 10 + Gravadas 5 supera el Total.')
    } else if (Math.abs(sumaPartes - total) > 1e-6) {
      advertencias.push('La suma de Exentas + Gravadas no coincide exactamente con el Total.')
    }
  }

  return { ok: errores.length === 0, errores, advertencias }
}

// ---------- Cerrar modal ----------
const pedirCerrar = () => {
  makeConfirm('¿Está seguro de que desea cancelar la carga?', '').then((result) => {
    if (result.isConfirmed) {
      makeToast('La acción ha sido cancelada.', 'success')
      emit('cerrar')
    }
  })
}

// ---------- Registrar / modificar ----------
const registrar = async () => {
  const { ok, errores, advertencias } = validarFormulario()

  if (!ok) {
    makeAlert('Revisá los datos', errores.join(' '), 'warning')
    return
  }
  if (advertencias.length) {
    const confirmacion = await makeConfirm(advertencias.join(' '), '¿Deseás continuar de todas formas?')
    if (!confirmacion.isConfirmed) return
  }

  // Antes, el modal de Venta armaba id_empresa desde `form.id_empresa`, que
  // nunca se completaba (siempre quedaba en 0). Acá se usa directo el store,
  // igual que ya hacía correctamente el modal de Compra.
  const payload: CompraVentaPayload = {
    tipo: props.tipo,
    id_empresa: seleccion.idEmpresa,
    id_sucursal: Number(form.id_sucursal),
    idcliente_proveedor: Number(form.idcliente_proveedor),
    numero_factura: form.numero_factura.trim(),
    numero_timbrado: toNumberSafe(form.numero_timbrado) ?? 0,
    tipo_de_factura: toUpperSafe(form.tipo_de_factura),
    condicion: toUpperSafe(form.condicion),
    moneda: toUpperSafe(form.moneda),
    imputada: toUpperSafe(form.imputada) || 'NO',
    fecha: form.fecha,
    fecha_vencimiento: form.fecha_vencimiento,
    total_factura: toNumberSafe(form.total_factura) ?? 0,
    exenta: toNumberSafe(form.exenta) ?? 0,
    gravada10: toNumberSafe(form.gravada10) ?? 0,
    gravada05: toNumberSafe(form.gravada05) ?? 0,
    base_imp_iva_10: toNumberSafe(form.base_imp_iva_10) ?? 0,
    base_imp_iva_05: toNumberSafe(form.base_imp_iva_05) ?? 0,
    importe_iva_10: toNumberSafe(form.importe_iva_10) ?? 0,
    importe_iva_05: toNumberSafe(form.importe_iva_05) ?? 0,
    cuenta_exenta: Number(form.idcuenta_exenta) || null,
    cuenta_grav10: Number(form.idcuenta_iva10) || null,
    cuenta_grav05: Number(form.idcuenta_iva5) || null,
    descripcion_exenta: form.descripcion_exenta.trim(),
    descripcion_iva10: form.descripcion_iva10.trim(),
    descripcion_iva5: form.descripcion_iva5.trim(),
    concepto: form.concepto.trim()
  }

  const etiqueta = props.tipo === 'COMPRA' ? 'compra' : 'venta'

  try {
    if (idEditar.value) {
      await modificarCompraVenta(idEditar.value, payload)
      makeToast(`La ${etiqueta} fue actualizada exitosamente.`, 'success')
    } else {
      await crearCompraVenta(payload)
      makeToast(`La ${etiqueta} fue guardada exitosamente.`, 'success')
    }
    emit('actualizartabla')
    emit('cerrar')
  } catch (error) {
    manejarError(error, `No se pudo registrar la ${etiqueta}.`)
  }
}

const manejarError = (error: unknown, mensajePorDefecto: string) => {
  console.error(error)
  const data = (error as { response?: { data?: any } })?.response?.data
  makeToast(data?.msg ?? mensajePorDefecto, 'error')
}

// ---------- Cargar datos de edición ----------
const cargarDatosDeEdicion = () => {
  if (!props.itemEditar) return

  idEditar.value = props.itemEditar.idcompra_venta ?? null
  Object.assign(form, { ...props.itemEditar })

  if (props.itemEditar.cuentaExenta) {
    form.cuenta_exenta = props.itemEditar.cuentaExenta.codigo
    nombreCuentaExenta.value = props.itemEditar.cuentaExenta.nombre
  }
  if (props.itemEditar.cuentaGrav10) {
    form.cuenta_grav10 = props.itemEditar.cuentaGrav10.codigo
    nombreCuentaIva10.value = props.itemEditar.cuentaGrav10.nombre
  }
  if (props.itemEditar.cuentaGrav05) {
    form.cuenta_grav05 = props.itemEditar.cuentaGrav05.codigo
    nombreCuentaIva05.value = props.itemEditar.cuentaGrav05.nombre
  }

  if (props.itemEditar.exenta) form.exenta = formatearImporte(props.itemEditar.exenta)
  if (props.itemEditar.gravada10) form.gravada10 = formatearImporte(props.itemEditar.gravada10)
  if (props.itemEditar.gravada05) form.gravada05 = formatearImporte(props.itemEditar.gravada05)
  if (props.itemEditar.total_factura) form.total_factura = formatearImporte(props.itemEditar.total_factura)
}

onMounted(async () => {
  await cargarCatalogos()
  cargarDatosDeEdicion()
})
</script>