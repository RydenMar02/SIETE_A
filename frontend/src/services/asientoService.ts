import api from './api'

export interface AsientoDetallePayload {
  id_empresacuenta: number
  debe: number
  haber: number
}

export interface AsientoPayload {
  id_empresa: number
  id_sucursal: number | null
  tipo_asiento: string
  documento: string
  total_debe: number
  total_haber: number
  diferencia: number
  numero_asiento: string
  fecha: string
  concepto: string
  asientoDetalles: AsientoDetallePayload[]
}

export const crearAsiento = (datos: AsientoPayload) =>
  api.post('/api/asientos', datos)

// Trae el último asiento de un tipo puntual, para calcular el próximo
// número con el prefijo correcto (M-00001, C-00001, V-00001, A-00001...).
// Sin tipoAsiento, trae el último de cualquier tipo (uso general, no para
// numeración).
export const obtenerUltimoAsiento = (idEmpresa: number, tipoAsiento?: string) =>
  api.get('/api/asientos', { params: { id_empresa: idEmpresa, tipo_asiento: tipoAsiento, limite: 1, desde: 0 } })

// ---------- Listado, detalle y anulación ----------

export const obtenerAsientos = (idEmpresa: number) =>
  api.get('/api/asientos', { params: { id_empresa: idEmpresa } })

export const obtenerDetalleAsiento = (idAsiento: number) =>
  api.get(`/api/asientos/${idAsiento}`)

export const anularAsiento = (idAsiento: number) =>
  api.delete(`/api/asientos/${idAsiento}`)

// Este reporte no sigue el patrón genérico de reportesService.ts
// (/api/{tipo}/pdf), tiene una ruta propia con un segmento extra.
export const obtenerUrlReporteAsientosPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportesasientos/asientos/pdf?id_empresa=${idEmpresa}`