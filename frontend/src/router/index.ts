import {createRouter, createWebHistory} from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
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
        }
    ]
})

export default router;