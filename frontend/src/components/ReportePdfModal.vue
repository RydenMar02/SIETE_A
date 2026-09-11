<template>
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3" @click.self="cerrar">
    <div class="w-full max-w-5xl h-[92vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">

      <div class="flex items-center justify-between px-4 py-3 bg-slate-700 text-white shrink-0">
        <p class="font-medium text-sm truncate pr-2">{{ titulo }}</p>
        <div class="flex items-center gap-4 shrink-0">
          <a
            :href="url"
            :download="nombreArchivo"
            class="text-sm font-medium underline hover:text-slate-200 transition"
          >
            Descargar PDF
          </a>
          <button type="button" class="text-slate-300 hover:text-white" @click="cerrar" aria-label="Cerrar">
            <i class="ti ti-x text-xl"></i>
          </button>
        </div>
      </div>

      <iframe :src="url" class="flex-1 w-full border-0" :title="titulo"></iframe>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  url: string
  titulo: string
  nombreArchivo: string
}>()

const emit = defineEmits<{ (e: 'cerrar'): void }>()

const cerrar = () => emit('cerrar')

const onKeydown = (evento: KeyboardEvent) => {
  if (evento.key === 'Escape') cerrar()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>