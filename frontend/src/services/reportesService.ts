import api from './api'

// Ajustar si tu router se monta bajo otro prefijo (ej: si en app.js hicieras
// app.use('/api/reportes', reportesRouter), esto ya coincide; si lo montaste
// distinto, cambiar solo esta constante.
const BASE = '/api/reportes'

export type TipoReporte =
  | 'asientos'
  | 'balance-sumas'
  | 'clientes'
  | 'proveedores'
  | 'compras'
  | 'ventas'
  | 'libro-diario'
  | 'libro-mayor'

export interface FiltrosReporte {
  fecha_desde?: string
  fecha_hasta?: string
}

// Trae los datos del reporte en JSON (para mostrar en pantalla, no el PDF)
export const obtenerReporte = (tipo: TipoReporte, idEmpresa: number, filtros: FiltrosReporte = {}) =>
  api.get(`${BASE}/${tipo}`, { params: { id_empresa: idEmpresa, ...filtros } })

// Reemplaza a la vieja abrirReportePdf: en vez de abrir una pestaña nueva
// con window.open, devuelve el blob URL para que la vista lo muestre en un
// <iframe> dentro de un modal (ReportePdfModal.vue), sin salir de /reportes.
// Quien llama a esto es responsable de revocar la URL con
// URL.revokeObjectURL cuando cierre el modal o pida otro reporte.
export const obtenerBlobReportePdf = async (
  tipo: TipoReporte,
  idEmpresa: number,
  filtros: FiltrosReporte
): Promise<string> => {
  const response = await api.get(`${BASE}/${tipo}/pdf`, {
    params: { id_empresa: idEmpresa, ...filtros },
    responseType: 'blob'
  })
  return URL.createObjectURL(response.data)
}

// Reporte de actividad del alumno: función aparte, con su propio flujo
// (id_sala + id_alumno + fecha puntual, no fecha_desde/fecha_hasta). No se
// toca ni se reutiliza para los reportes generales de arriba.
export const obtenerBlobReporteActividadAlumno = async (idSala: number, idAlumno: number, fecha: string) => {
  const response = await api.get(`${BASE}/actividad-alumno/pdf`, {
    params: { id_sala: idSala, id_alumno: idAlumno, fecha },
    responseType: 'blob'
  })
  return URL.createObjectURL(response.data)
}