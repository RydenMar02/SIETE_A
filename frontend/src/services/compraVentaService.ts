import api from './api'

export type TipoComprobante = 'COMPRA' | 'VENTA'

// "imputada" ya no viaja acá: el backend la ignora al crear/editar (siempre
// arranca en 'NO'), y solo cambia a 'SI' a través de imputarCompraVenta().
export interface CompraVentaPayload {
  tipo: TipoComprobante
  id_empresa: number
  id_sucursal: number
  id_clienteproveedor: number
  numero_factura: string
  numero_timbrado: number
  tipo_de_factura: string
  condicion: string
  moneda: string
  fecha: string
  fecha_vencimiento: string
  total_factura: number
  exenta: number
  gravada10: number
  gravada05: number
  base_imp_iva_10: number
  base_imp_iva_05: number
  importe_iva_10: number
  importe_iva_05: number
  id_cuentaexenta: number | null
  id_cuentagrav10: number | null
  id_cuentagrav05: number | null
  descripcion_exenta: string
  descripcion_iva10: string
  descripcion_iva5: string
  concepto: string
}

export interface LineaSugerenciaAsiento {
  id_empresacuenta: number
  debe: number
  haber: number
  cuenta?: { id_empresacuenta: number; codigo: string; nombre: string }
}

export interface SugerenciaAsiento {
  id_compraventa: number
  id_sucursal: number
  fecha: string
  documento: string
  concepto: string
  tipo_asiento: TipoComprobante
  detalles: LineaSugerenciaAsiento[]
}

export const crearCompraVenta = (datos: CompraVentaPayload) =>
  api.post('/api/compras-ventas', datos)

export const modificarCompraVenta = (idCompraVenta: number, datos: CompraVentaPayload) =>
  api.put(`/api/compras-ventas/${idCompraVenta}`, datos)

// ---------- Listado y detalle ----------

export const obtenerComprasVentas = (tipo: TipoComprobante, idEmpresa: number, imputada?: 'SI' | 'NO') =>
  api.get('/api/compras-ventas', { params: { tipo, id_empresa: idEmpresa, imputada } })

export const obtenerCompraVentaPorId = (idCompraVenta: number) =>
  api.get(`/api/compras-ventas/${idCompraVenta}`)

// Previsualización: qué líneas debe/haber generaría imputar esta compra/venta
// ahora mismo, sin persistir nada. Solo tiene sentido sobre un borrador.
export const obtenerSugerenciaAsiento = (idCompraVenta: number) =>
  api.get(`/api/compras-ventas/${idCompraVenta}/sugerencia-asiento`)

// ACCIÓN DE NEGOCIO: genera el asiento real y pasa imputada a 'SI'. A partir
// de acá la compra/venta queda bloqueada para editar/eliminar.
export const imputarCompraVenta = (idCompraVenta: number) =>
  api.post(`/api/compras-ventas/${idCompraVenta}/imputar`)

// ACCIÓN DE NEGOCIO: reversa una compra/venta YA imputada (anula su asiento
// también). Antes esta función pegaba por error al DELETE de abajo -por eso
// nunca podía anular algo realmente imputado, el backend lo rechazaba.
export const anularCompraVenta = (idCompraVenta: number) =>
  api.post(`/api/compras-ventas/${idCompraVenta}/anular`)

// Descarta un BORRADOR (imputada='NO'). El backend rechaza esto si ya está
// imputada -para esa reversión hay que usar anularCompraVenta() de arriba.
export const desactivarCompraVenta = (idCompraVenta: number) =>
  api.delete(`/api/compras-ventas/${idCompraVenta}`)

// Reporte de compras: ruta propia, no sigue el patrón genérico de reportesService.
export const obtenerUrlReporteComprasPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportes/compras/pdf?id_empresa=${idEmpresa}`

// Reporte de ventas: en este caso sí resultó simétrico al de compras.
export const obtenerUrlReporteVentasPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportes/ventas/pdf?id_empresa=${idEmpresa}`