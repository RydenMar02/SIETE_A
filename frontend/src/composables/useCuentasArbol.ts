import type { CuentaEstructuraRaw, CuentaAplanada } from '@/services/cuentaService'

// Compara códigos jerárquicos tipo "1.10" vs "1.9" segmento por segmento
// como números. Un orden alfabético simple pondría "1.10" antes que "1.9"
// (porque "1" < "9" como caracteres), lo cual queda mal para un plan de
// cuentas — acá se comparan como números reales en cada nivel.
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
// ordenada por código y conservando el nivel de indentación para mostrarlo
// visualmente en una tabla.
export function aplanarCuentas (
  cuentas: CuentaEstructuraRaw[],
  nivel = 0,
  idPadre: number | null = null
): CuentaAplanada[] {
  const ordenadas = [...cuentas].sort(compararCodigos)

  return ordenadas.flatMap((c) => {
    const { cuentasHijas, ...resto } = c
    const actual: CuentaAplanada = { ...resto, nivelIndentado: nivel, id_padre: idPadre }
    const hijas = cuentasHijas?.length ? aplanarCuentas(cuentasHijas, nivel + 1, c.id_cuenta) : []
    return [actual, ...hijas]
  })
}