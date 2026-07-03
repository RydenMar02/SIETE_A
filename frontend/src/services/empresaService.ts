import api from './api'

export interface Empresa {
  id_empresa: number
  nombre: string
  ruc?: string
  sigla?: string
  id_periodo?: number
}

export interface EmpresaPayload {
  nombre: string
  ruc: string
  sigla: string
  id_periodo: number
  idsala_usuario: number
  estado: boolean
}

export const obtenerEmpresasPorSalaUsuario = (idSalaUsuario: number) =>
  api.get('/api/empresas/salausuario', { params: { idsala_usuario: idSalaUsuario } })

// Trae TODAS las empresas registradas (sin filtrar por sala), se usa para
// chequear duplicados antes de crear una nueva.
export const obtenerEmpresas = () =>
  api.get('/api/empresas')

export const crearEmpresa = (datos: EmpresaPayload) =>
  api.post('/api/empresas', datos, { params: { idsala_usuario: datos.idsala_usuario } })

export const modificarEmpresa = (idEmpresa: number, datos: Partial<EmpresaPayload>) =>
  api.put(`/api/empresas/${idEmpresa}`, datos)