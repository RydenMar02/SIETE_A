import api from './api'

// Los tres gráficos (sucursales, clientes, proveedores) comparten la misma forma
// de endpoint: /api/graficos/{tipo}/{idEmpresa}. Una sola función cubre los tres,
// el componente decide después cómo mapear los datos según el tipo.
export const obtenerTopDatos = (tipo: 'top-sucursales' | 'top-clientes' | 'top-proveedores', idEmpresa: number) =>
  api.get(`/api/graficos/${tipo}/${idEmpresa}`)