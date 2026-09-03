import { watch, onBeforeUnmount, type Ref } from 'vue'
import { useTiempoRealStore } from '@/stores/useTiempoRealStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'

/**
 * Instrumenta la pantalla actual para el "espejo de app": si algún
 * profesor está espectando al alumno actual, esto manda en vivo (con
 * throttle) lo que `snapshot` devuelva en ese momento. `emitirEstadoApp`
 * del store ya se ocupa de no mandar nada si nadie está espectando, así
 * que llamar a este composable en cualquier pantalla es siempre gratis en
 * el caso común (nadie mirando).
 *
 * `ruta` identifica la pantalla (se usa para el label en "Seguimiento en
 * aula" y para que EspectarAlumnoModal decida cómo dibujar el snapshot).
 * `snapshot` es cualquier objeto plano — cada pantalla decide qué es
 * relevante mostrarle al profesor.
 */
export function useEspejoApp(ruta: string, snapshot: Ref<Record<string, unknown>>) {
  const tiempoReal = useTiempoRealStore()
  const seleccion = useSeleccionStore()

  let temporizador: ReturnType<typeof setTimeout> | null = null

  watch(snapshot, (estado) => {
    if (temporizador) clearTimeout(temporizador)
    // Throttle de 400ms: se ve "en vivo" sin mandar un evento por cada
    // tecla/click. Mismo valor que ya se usaba a mano en Asiento.
    temporizador = setTimeout(() => {
      tiempoReal.emitirEstadoApp(seleccion.idSala, ruta, estado)
    }, 400)
  }, { deep: true, immediate: true })

  onBeforeUnmount(() => {
    if (temporizador) clearTimeout(temporizador)
  })
}