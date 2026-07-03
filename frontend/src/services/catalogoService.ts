import api from './api'

// Antes eran tablas propias (tipos_contribuyentes, tipos_documentos) con id + descripción.
// Ahora son enums fijos dentro de la tabla clientes/proveedores, así que no hace
// falta pedirlos por HTTP — son un valor constante conocido en el frontend.
export const TIPOS_DOCUMENTO = ['RUC', 'CI', 'PASAPORTE', 'DNI', 'RIF', 'NO_RESIDENTE'] as const
export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]

export const TIPOS_CONTRIBUYENTE = ['PERSONA_FISICA', 'PERSONA_JURIDICA', 'NO_CONTRIBUYENTE', 'DE_ESTADO'] as const
export type TipoContribuyente = typeof TIPOS_CONTRIBUYENTE[number]

// Etiquetas legibles para mostrar en el <select> sin tocar el valor que viaja a la API
export const ETIQUETAS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  RUC: 'RUC',
  CI: 'Cédula de Identidad',
  PASAPORTE: 'Pasaporte',
  DNI: 'DNI',
  RIF: 'RIF',
  NO_RESIDENTE: 'No residente'
}

export const ETIQUETAS_TIPO_CONTRIBUYENTE: Record<TipoContribuyente, string> = {
  PERSONA_FISICA: 'Persona física',
  PERSONA_JURIDICA: 'Persona jurídica',
  NO_CONTRIBUYENTE: 'No contribuyente',
  DE_ESTADO: 'De estado'
}

// Ciudades sigue siendo una tabla real en la base de datos
export interface Ciudad {
  id_ciudad: number
  nombre: string
}

export const obtenerCiudades = () => api.get('/api/ciudades')