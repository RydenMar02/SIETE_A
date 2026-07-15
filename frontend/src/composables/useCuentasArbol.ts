import type { CuentaEstructuraRaw, CuentaAplanada } from '@/services/cuentaService'

// Compara códigos jerárquicos tipo "1.10" vs "1.9" segmento por segmento
// como números, para que "1.9" quede antes que "1.10".
function compararCodigos (a: CuentaEstructuraRaw, b: CuentaEstructuraRaw): number {
  const partesA = a.codigo.split('.').map(Number)
  const partesB = b.codigo.split('.').map(Number)
  const len = Math.max(partesA.length, partesB.length)

  for (let i = 0; i < len; i++) {
    const numA = partesA[i] ?? 0
    const numB = partesB[i] ?? 0
    if (numA !== numB) return numA - numB
  }
  return 0
}

// Convierte un árbol de cuentas (con cuentasHijas anidadas) en una lista plana,
// ordenada por código y con el nivel de indentación para mostrarla en tabla.
//
export function aplanarCuentas (
  cuentas: CuentaEstructuraRaw[],
  nivel = 0,
  idPadre: number | null = null
): CuentaAplanada[] {
  const ordenadas = [...cuentas].sort(compararCodigos)

  return ordenadas.flatMap((c) => {
    const { cuentasHijas, ...resto } = c
    const actual: CuentaAplanada = { ...resto, nivelIndentado: nivel, id_padre: idPadre }
    const hijas = cuentasHijas?.length ? aplanarCuentas(cuentasHijas, nivel + 1, c.id_empresacuenta) : []
    return [actual, ...hijas]
  })
}