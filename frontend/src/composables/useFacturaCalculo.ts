// Funciones puras de normalización/formateo de números para formularios de
// facturas (compra/venta). Antes estaban duplicadas idénticas en los dos modales.
const formateador = new Intl.NumberFormat('es-PY')

export const toUpperSafe = (v: string) => (v ?? '').toString().trim().toUpperCase()

export const isEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

// Convierte strings con separadores de miles y coma decimal a número.
// Ej: "1.234,56" -> 1234.56
export function toNumberSafe (input: any): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  const s = String(input).trim()
  if (!s) return null
  const normalized = s.replace(/\./g, '').replace(/,/g, '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export const mustBeNonNegative = (n: number | null): boolean => n === null || n >= 0

export const formatearImporte = (valor: number): string => formateador.format(valor)

// Parsea un input tipo "1.234,56" a número, o null si no es válido
export const parsearImporte = (valor: string): number | null => {
  const limpio = (valor ?? '').trim().replace(/\./g, '').replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

// Calcula base imponible e IVA a partir de un monto "gravado" y una tasa (0.10 o 0.05)
export function calcularBaseEIva (montoGravado: number, tasa: number) {
  const base = montoGravado / (1 + tasa)
  const iva = montoGravado - base
  return { base, iva }
}