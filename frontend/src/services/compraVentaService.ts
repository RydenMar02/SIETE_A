import api from './api'

export type TipoComprobante = 'COMPRA' | 'VENTA'

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
  imputada: string
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

export const crearCompraVenta = (datos: CompraVentaPayload) =>
  api.post('/api/compras-ventas', datos)

export const modificarCompraVenta = (idCompraVenta: number, datos: CompraVentaPayload) =>
  api.put(`/api/compras-ventas/${idCompraVenta}`, datos)

// ---------- Listado y anulación ----------
 
export const obtenerComprasVentas = (tipo: TipoComprobante, idEmpresa: number) =>
  api.get('/api/compras-ventas', { params: { tipo, id_empresa: idEmpresa } })
 
export const anularCompraVenta = (idCompraVenta: number) =>
  api.delete(`/api/compras-ventas/${idCompraVenta}`)
 
// Reporte de compras: ruta propia, no sigue el patrón genérico de reportesService.
export const obtenerUrlReporteComprasPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportes/compras/pdf?id_empresa=${idEmpresa}`

// Reporte de ventas: en este caso sí resultó simétrico al de compras.
export const obtenerUrlReporteVentasPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportes/ventas/pdf?id_empresa=${idEmpresa}`