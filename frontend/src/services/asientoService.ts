import api from './api'

export interface AsientoDetallePayload {
  idempresa_cuenta: number
  debe: number
  haber: number
}

export interface AsientoPayload {
  id_empresa: number
  id_sucursal: number | null
  id_tipo_asiento: number | null
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

// Trae el último asiento registrado para calcular el próximo número (A-00001, A-00002...)
export const obtenerUltimoAsiento = (idEmpresa: number) =>
  api.get('/api/asientos', { params: { id_empresa: idEmpresa, limite: 1, desde: 0 } })

// ---------- Listado, detalle y anulación ----------

export const obtenerAsientos = (idEmpresa: number) =>
  api.get('/api/asientos', { params: { id_empresa: idEmpresa } })

export const obtenerDetalleAsiento = (idAsiento: number) =>
  api.get(`/api/detalleasiento/${idAsiento}`)

export const anularAsiento = (idAsiento: number) =>
  api.delete(`/api/asientos/${idAsiento}`)

// Este reporte no sigue el patrón genérico de reportesService.ts
// (/api/{tipo}/pdf), tiene una ruta propia con un segmento extra.
export const obtenerUrlReporteAsientosPdf = (idEmpresa: number) =>
  `${import.meta.env.VITE_API_URL}/api/reportesasientos/asientos/pdf?id_empresa=${idEmpresa}`