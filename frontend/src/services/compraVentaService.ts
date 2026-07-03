import api from './api'

export type TipoComprobante = 'COMPRA' | 'VENTA'

export interface CompraVentaPayload {
  tipo: TipoComprobante
  id_empresa: number
  id_sucursal: number
  idcliente_proveedor: number
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
  cuenta_exenta: number | null
  cuenta_grav10: number | null
  cuenta_grav05: number | null
  descripcion_exenta: string
  descripcion_iva10: string
  descripcion_iva5: string
  concepto: string
}

export const crearCompraVenta = (datos: CompraVentaPayload) =>
  api.post('/api/comprasventas', datos)

export const modificarCompraVenta = (idCompraVenta: number, datos: CompraVentaPayload) =>
  api.put(`/api/comprasventas/${idCompraVenta}`, datos)