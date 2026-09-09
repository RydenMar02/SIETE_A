<template>
  <div class="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4" @click.self="cerrar">
    <div class="w-full max-w-md max-h-[80vh]">
      <ChatConversacion :id-sala="idSala" :id-alumno="idAlumno" :nombre-alumno="nombreAlumno" @cerrar="cerrar" />
    </div>
  </div>
</template>

<script lang="ts" setup>
// Modal de chat con un alumno puntual, dentro de una sala. Se usa desde
// "Seguimiento en aula" (al hacer click en "Mensaje" sobre un alumno) y
// desde la campanita de Notificaciones (al hacer click en un mensaje
// entrante). La lógica de conversación en sí vive en ChatConversacion.vue,
// que también reusa el panel de "Ver reporte de actividad" -este archivo
// ya es solo el overlay centrado que la envuelve.
import ChatConversacion from './ChatConversacion.vue'

defineProps<{
  idSala: number
  idAlumno: number
  nombreAlumno: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const cerrar = () => emit('cerrar')
</script>