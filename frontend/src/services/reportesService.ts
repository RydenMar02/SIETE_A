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

// Trae los datos del reporte en JSON (para mostrar en pantalla, no el PDF)
export const obtenerReporte = (tipo: TipoReporte, idEmpresa: number) =>
  api.get(`${BASE}/${tipo}`, { params: { id_empresa: idEmpresa } })

export const abrirReportePdf = async (tipo: TipoReporte, idEmpresa: number) => {
  const response = await api.get(`${BASE}/${tipo}/pdf`, {
    params: { id_empresa: idEmpresa },
    responseType: 'blob'
  })

  const blobUrl = URL.createObjectURL(response.data)
  window.open(blobUrl, '_blank')

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

// A diferencia de abrirReportePdf, esto no abre una pestaña nueva: devuelve
// el blob URL para que el llamador lo use en un <iframe> (vista previa
// incrustada, ej. el panel de "Ver reporte" en Seguimiento en aula). Queda
// a cargo de quien lo use revocar el blob con URL.revokeObjectURL cuando
// cierre esa vista, para no quedarse con memoria reservada de más.
export const obtenerBlobReporteActividadAlumno = async (idSala: number, idAlumno: number, fecha: string) => {
  const response = await api.get(`${BASE}/actividad-alumno/pdf`, {
    params: { id_sala: idSala, id_alumno: idAlumno, fecha },
    responseType: 'blob'
  })
  return URL.createObjectURL(response.data)
}