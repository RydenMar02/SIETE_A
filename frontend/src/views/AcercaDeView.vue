<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />

    <div class="flex flex-1">
      <Siderbar />

      <main class="flex-1 overflow-auto bg-slate-100">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">

          <!-- Hero -->
          <div class="bg-slate-700 rounded-2xl shadow-md overflow-hidden relative mb-6">
            <div class="absolute inset-0 opacity-10 pointer-events-none">
              <div class="absolute -right-10 -top-10 w-56 h-56 rounded-full border-8 border-white"></div>
              <div class="absolute right-16 -bottom-10 w-32 h-32 rounded-full border-8 border-white"></div>
            </div>
            <div class="relative px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
              <img src="../assets/logoConta432x432.png" alt="Logo SIETE" class="w-24 h-24 object-contain drop-shadow-lg" />
              <div class="text-center sm:text-left">
                <p class="text-green-400 text-xs font-semibold tracking-[0.2em] uppercase mb-1">Acerca del sistema</p>
                <h1 class="text-3xl sm:text-4xl font-bold text-white leading-tight">SIETE</h1>
                <p class="text-slate-300 text-sm sm:text-base mt-1">
                  Sistema Integrado de Educación, Tecnología y Estados Contables
                </p>
              </div>
            </div>
          </div>

          <!-- Qué es -->
          <div class="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">¿Qué es SIETE?</h2>
            <p class="text-gray-600 leading-relaxed text-sm sm:text-base">
              SIETE es un sistema contable pensado para el aula: le permite a un docente crear una
              sala de clase con contraseña, y a cada alumno inscribirse y practicar la carga de una
              empresa completa &mdash; plan de cuentas, clientes, proveedores, compras, ventas y
              asientos &mdash; como si estuviera trabajando en un caso real, pero en un entorno
              controlado y evaluable.
            </p>
          </div>

          <!-- Flujo de aprendizaje -->
          <div class="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Cómo se usa</h2>
            <p class="text-gray-500 text-sm mb-6">El recorrido que sigue cada alumno dentro de una sala.</p>

            <div class="relative">
              <div class="absolute left-3.75 top-2 bottom-2 w-px bg-gray-200 sm:left-4.75"></div>

              <div class="flex flex-col gap-6">
                <div v-for="paso in flujo" :key="paso.titulo" class="flex gap-4 relative">
                  <div class="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-slate-700 text-white flex items-center justify-center z-10">
                    <i :class="paso.icono" class="text-base sm:text-lg"></i>
                  </div>
                  <div class="pt-1">
                    <p class="font-semibold text-gray-900 text-sm sm:text-base">{{ paso.titulo }}</p>
                    <p class="text-gray-500 text-sm">{{ paso.descripcion }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Roles -->
          <div class="grid sm:grid-cols-3 gap-4 mb-6">
            <div v-for="rol in roles" :key="rol.nombre" class="bg-white rounded-xl shadow-md border border-gray-200 p-5">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" :class="rol.colorFondo">
                <i :class="[rol.icono, 'text-lg', rol.colorIcono]"></i>
              </div>
              <p class="font-semibold text-gray-900 text-sm">{{ rol.nombre }}</p>
              <p class="text-gray-500 text-xs mt-1 leading-relaxed">{{ rol.descripcion }}</p>
            </div>
          </div>

          <!-- Desarrollado por -->
          <div class="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8 mb-6">
            <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Desarrollado por</p>
            <p class="text-gray-600 text-sm mb-4">
              Alumnos de la carrera de Ingeniería en Informática Empresarial:
            </p>
            <div class="grid sm:grid-cols-2 gap-4 mb-4">
              <div v-for="autor in autores" :key="autor" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0">
                  <i class="ti ti-user text-lg"></i>
                </div>
                <p class="font-medium text-gray-900 text-sm">{{ autor }}</p>
              </div>
            </div>
            <p class="text-gray-500 text-xs italic border-t border-gray-100 pt-4">
              Un sistema pensado para que la teoría contable se aprenda haciendo, no memorizando.
            </p>
          </div>

          <!-- Créditos / pie -->
          <div class="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Versión</p>
                <p class="text-gray-900 font-medium">{{ version }}</p>
              </div>
              <div class="sm:text-right">
                <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Desarrollo</p>
                <p class="text-gray-900 font-medium text-sm">
                  Proyecto de tesis &middot; Ingeniería en Informática Empresarial
                </p>
                <p class="text-gray-500 text-sm">Universidad Nacional de Concepción</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Navbar from '@/components/NavbarComponent.vue'
import Siderbar from '@/components/SiderbarComponent.vue'

const version = '3.0.0'

const autores = [
  'María del Carmen Fariña Noceda',
  'Ricardo Matías Diana'
]

const flujo = [
  { icono: 'ti ti-school', titulo: 'Elegir curso y semestre', descripcion: 'El punto de partida para encontrar la sala correspondiente.' },
  { icono: 'ti ti-door-enter', titulo: 'Ingresar a una sala', descripcion: 'Con la contraseña que compartió el docente, o crearla si sos profesor.' },
  { icono: 'ti ti-building', titulo: 'Elegir o crear una empresa', descripcion: 'Cada empresa arranca con un plan de cuentas por defecto ya cargado.' },
  { icono: 'ti ti-file-invoice', titulo: 'Cargar operaciones', descripcion: 'Clientes, proveedores, compras, ventas y asientos contables.' },
  { icono: 'ti ti-report', titulo: 'Revisar los reportes', descripcion: 'Libro Diario, Libro Mayor y Balance de Sumas y Saldos, generados automáticamente.' }
]

const roles = [
  {
    nombre: 'Administrador',
    descripcion: 'Gestiona los usuarios y el acceso general al sistema.',
    icono: 'ti ti-shield-check',
    colorFondo: 'bg-purple-50',
    colorIcono: 'text-purple-600'
  },
  {
    nombre: 'Profesor',
    descripcion: 'Crea salas de clase y supervisa el trabajo de sus alumnos.',
    icono: 'ti ti-chalkboard',
    colorFondo: 'bg-blue-50',
    colorIcono: 'text-blue-600'
  },
  {
    nombre: 'Alumno',
    descripcion: 'Se inscribe en una sala y practica la carga contable completa.',
    icono: 'ti ti-user',
    colorFondo: 'bg-green-50',
    colorIcono: 'text-green-600'
  }
]
</script>