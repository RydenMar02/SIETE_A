import { createRouter, createWebHistory } from 'vue-router'
import { useSesionStore } from '@/stores/useSesionStore'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/seleccion',
    name: 'seleccion',
    component: () => import('../views/SeleccionView.vue')
  },
  {
    path: '/menu',
    name: 'menu',
    component: () => import('../views/MenuView.vue')
  },
  {
    path: '/asiento',
    name: 'asiento',
    component: () => import('../views/AsientoContableView.vue')
  },
  {
    path: '/cliente',
    name: 'cliente',
    component: () => import('../views/ClienteView.vue')
  },
  {
    path: '/proveedor',
    name: 'proveedor',
    component: () => import('../views/ProveedorView.vue')
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('../views/PerfilVuew.vue')
  },
  {
    path: '/empresa',
    name: 'empresa',
    component: () => import('../views/EmpresaView.vue')
  },
  {
    path: '/crearsala',
    name: 'salas',
    component: () => import('../views/SalasView.vue')
  },
  {
    path: '/sucursal',
    name: 'sucursal',
    component: () => import('../views/SucursalesView.vue')
  },
  {
    path: '/cuentas',
    name: 'cuentas',
    component: () => import('../views/PlanCuentasView.vue')
  },
  {
    path: '/compra',
    name: 'compra',
    component: () => import('../views/CompraView.vue')
  },
  {
    path: '/venta',
    name: 'venta',
    component: () => import('../views/VentaView.vue')
  },
  {
    path: '/periodo',
    name: 'periodo',
    component: () => import('../views/PeriodoView.vue')
  },
  {
    path: '/acercade',
    name: 'acercade',
    component: () => import('../views/AcercaDeView.vue')
  },
  {
    path: '/acceso-denegado',
    name: 'security',
    component: () => import('../views/AccessValidation.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navegación: si no hay sesión, solo se permite ir al login o a la
// pantalla de acceso denegado. Cualquier otra ruta redirige a 'security'.
router.beforeEach((to, from, next) => {
  const sesion = useSesionStore()

  const rutasPublicas = ['Login', 'security']

  if (!sesion.token && !rutasPublicas.includes(String(to.name))) {
    next({ name: 'security' })
  } else {
    next()
  }
})

export default router