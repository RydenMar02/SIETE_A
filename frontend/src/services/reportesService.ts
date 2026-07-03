// Estos reportes se abren directamente en una pestaña nueva (no se piden por axios),
// así que acá solo se centraliza cómo se arma la URL — es la única parte que antes
// dependía de `import.meta.env` directo dentro del componente.
const BASE_URL = import.meta.env.VITE_API_URL

export type TipoReporte = 'reporteslibrodiario' | 'reporteslibromayor' | 'reportesbalancesumas'

export const obtenerUrlReportePdf = (tipo: TipoReporte, idEmpresa: number) =>
  `${BASE_URL}/api/${tipo}/pdf?id_empresa=${idEmpresa}`