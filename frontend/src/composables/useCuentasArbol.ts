import type { CuentaEstructuraRaw, CuentaAplanada } from '@/services/cuentaService'

// Convierte un árbol de cuentas (con cuentasHijas anidadas) en una lista plana,
// conservando el nivel de indentación para mostrarlo visualmente en una tabla.
export function aplanarCuentas (
  cuentas: CuentaEstructuraRaw[],
  nivel = 0,
  idPadre: number | null = null
): CuentaAplanada[] {
  return cuentas.flatMap((c) => {
    const { cuentasHijas, ...resto } = c
    const actual: CuentaAplanada = { ...resto, nivelIndentado: nivel, id_padre: idPadre }
    const hijas = cuentasHijas ? aplanarCuentas(cuentasHijas, nivel + 1, c.id_cuenta) : []
    return [actual, ...hijas]
  })
}