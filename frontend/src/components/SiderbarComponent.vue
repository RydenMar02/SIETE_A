<template>
  <!-- Fondo oscuro al abrir en mobile: tocarlo cierra la sidebar -->
  <div
    v-if="ui.sidebarAbierta"
    class="fixed inset-0 bg-black/40 z-30 md:hidden"
    @click="ui.cerrarSidebar()"
  ></div>

  <aside
    class="fixed md:sticky top-0 left-0 h-screen w-64 bg-siete-bg border-r border-gray-200 overflow-y-auto z-40 transition-transform duration-200"
    :class="ui.sidebarAbierta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <!-- Perfil / sala / empresa actuales -->
    <div class="border-b border-gray-200">
      <router-link to="/perfil" class="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300 border-b border-gray-200">
        <Icon icon="mdi:user" width="22" />
        <span class="truncate">{{ nombre }}</span>
      </router-link>
      <router-link to="/seleccion" class="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300 border-b border-gray-200">
        <Icon icon="mdi:google-classroom" width="22" />
        <span class="truncate">{{ salaNombre || 'Sin sala seleccionada' }}</span>
      </router-link>
      <router-link to="/seleccion" class="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300">
        <Icon icon="mdi:office-building" width="22" />
        <span class="truncate">{{ empresaNombre || 'Sin empresa seleccionada' }}</span>
      </router-link>
    </div>

    <!-- Enlaces directos (no colapsables) -->
    <nav class="border-b border-gray-200">
      <router-link
        to="/menu"
        class="flex items-center gap-2 px-4 py-3 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
      >
        <Icon icon="mdi:home" width="22" />
        Menú
      </router-link>

      <router-link
        v-if="esAdmin"
        to="/User"
        class="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300"
      >
        <Icon icon="mdi:users" width="22" />
        Usuarios
      </router-link>
    </nav>

    <!-- Grupos colapsables -->
    <nav>
      <div v-for="grupo in gruposVisibles" :key="grupo.clave" class="border-b border-gray-200">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300"
          @click="toggleGrupo(grupo.clave)"
        >
          <span class="flex items-center gap-2">
            <Icon :icon="grupo.icono" width="22" />
            {{ grupo.titulo }}
          </span>
          <Icon
            icon="mdi:chevron-down"
            width="18"
            class="transition-transform"
            :class="{ 'rotate-180': gruposAbiertos.has(grupo.clave) }"
          />
        </button>

        <div v-show="gruposAbiertos.has(grupo.clave)" class="pl-4 pb-1">
          <router-link
            v-for="item in grupo.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-300 rounded"
          >
            <Icon :icon="item.icono" width="20" />
            {{ item.label }}
          </router-link>
        </div>
      </div>

      <!-- Acerca de -->
      <router-link
        v-if="esDocenteOAlumno"
        to="/acercade"
        class="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-gray-300 border-b border-gray-200"
      >
        <Icon icon="mdi:chart-box-outline" width="22" />
        Acerca De
      </router-link>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSesionStore } from '@/stores/useSesionStore'
import { useSeleccionStore } from '@/stores/useSeleccionStore'
import { useUiStore } from '@/stores/useUiStore'

const sesion = useSesionStore()
const seleccion = useSeleccionStore()
const ui = useUiStore()

const nombre = computed(() => sesion.nombre)
const salaNombre = computed(() => seleccion.nombreSala)
const empresaNombre = computed(() => seleccion.nombreEmpresa)

const esAdmin = computed(() => sesion.idRol === 1)
const esDocenteOAlumno = computed(() => sesion.idRol === 2 || sesion.idRol === 3)

// ---------- Menú colapsable, data-driven ----------
// Antes cada sección (Salas, Mi Empresa, Libro IVA, Contabilidad, Configuración)
// era un bloque de HTML copiado y pegado, cambiando título/ícono/links/rol.
// Acá es un array: agregar o quitar una sección es editar este array,
// el template de abajo (un solo v-for) no se vuelve a tocar.
interface ItemMenu {
  label: string
  icono: string
  to: string
}

interface GrupoMenu {
  clave: string
  titulo: string
  icono: string
  roles: number[] // 1 = admin, 2 = profesor, 3 = alumno
  items: ItemMenu[]
}

const grupos: GrupoMenu[] = [
  {
    clave: 'salas',
    titulo: 'Salas',
    icono: 'mdi:school-outline',
    roles: [2],
    items: [
      { label: 'Crear', icono: 'mdi:create-new-folder-outline', to: '/crearsala' }
    ]
  },
  {
    clave: 'empresa',
    titulo: 'Mi Empresa',
    icono: 'mdi:domain',
    roles: [2, 3],
    items: [
      { label: 'Empresas', icono: 'mdi:office-building', to: '/empresa' },
      { label: 'Sucursales', icono: 'mdi:office-building-marker', to: '/sucursal' },
      { label: 'Proveedores', icono: 'mdi:box-add', to: '/proveedor' },
      { label: 'Clientes', icono: 'mdi:account-cash', to: '/cliente' },
      { label: 'Cuentas', icono: 'mdi:planner', to: '/cuentas' }
    ]
  },
  {
    clave: 'libroIva',
    titulo: 'Libro IVA',
    icono: 'mdi:book-open-variant-outline',
    roles: [2, 3],
    items: [
      { label: 'Compras', icono: 'mdi:invoice-text-edit-outline', to: '/compra' },
      { label: 'Ventas', icono: 'mdi:invoice-export-outline', to: '/venta' }
    ]
  },
  {
    clave: 'contabilidad',
    titulo: 'Contabilidad',
    icono: 'mdi:chart-box-outline',
    roles: [2, 3],
    items: [
      { label: 'Asientos contables', icono: 'mdi:clipboard-text', to: '/asiento' },
      { label: 'Libro Diario', icono: 'mdi:book-open-page-variant', to: '/librodiario' },
      { label: 'Libro Mayor', icono: 'mdi:book-multiple', to: '/libromayor' },
      { label: 'Balances', icono: 'mdi:chart-bar', to: '/balances' }
    ]
  },
  {
    clave: 'configuracion',
    titulo: 'Configuración',
    icono: 'mdi:cog-outline',
    roles: [2, 3],
    items: [
      { label: 'Configuración', icono: 'mdi:wrench-cog-outline', to: '/config' },
      { label: 'Periodos', icono: 'mdi:calendar-month-outline', to: '/periodo' },
      { label: 'Ayuda', icono: 'mdi:help', to: '/ayuda' }
    ]
  }
]

const gruposVisibles = computed(() => grupos.filter((g) => g.roles.includes(sesion.idRol)))

// ---------- Estado de abierto/cerrado de cada grupo ----------
// Un Set con las claves de los grupos abiertos. Reemplaza los 6 ids distintos
// (#salasCollapse, #empresaCollapse, etc.) que dependían del JS de Bootstrap.
const gruposAbiertos = ref(new Set<string>())

const toggleGrupo = (clave: string) => {
  if (gruposAbiertos.value.has(clave)) {
    gruposAbiertos.value.delete(clave)
  } else {
    gruposAbiertos.value.add(clave)
  }
  // Forzar nueva referencia para que Vue detecte el cambio dentro del Set
  gruposAbiertos.value = new Set(gruposAbiertos.value)
}
</script>