# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

# estructura del proyecto

carptetas y lo que contienen cada uno

src/
 ├── assets/          # imágenes, css global
 ├── components/      # piezas reutilizables
 ├── views/           # pantallas completas
 ├── services/        # llamadas al backend (axios)
 ├── stores/          # estado global (Pinia)
 ├── router/          # rutas para navegar de componente a componente dentro del sistema 
 ├── App.vue          # layout principal
 └── main.ts          # punto de entrada


 Pinia : es una libreria de gestion de estados para aplicaciones Vue. Es para guardar datos que toda la pagina necesita, como por ejemplo Usuario, si es que se quiere usar usuario en otra parte, con esto ya no es necesario usar LocalStorage o hacer varias consultas al servidor.

  Tailwind CSS, según su propio sitio web, es un "framework CSS que prioriza las utilidades" que proporciona varias de estas clases de utilidades de un solo propósito que puedes utilizar directamente dentro de tu marcado para diseñar un elemento.

# comando de componenentes usados

-- ROUTER
npm install vue-router

-- ICONOS
npm install @tabler/icons-webfont

-- PINIA 
 npm install pinia
 npm install pinia-plugin-persistedstate

 luego en el main.ts
 import { createPinia } from "pinia";
 app.use(createPinia()); 

-- TAILWINDCSS
npm install tailwindcss @tailwindcss/vite

-- en vite.config.ts 
import tailwindcss from '@tailwindcss/vite'
tailwindcss(),

--en style.css
@import "tailwindcss";


-- ALERTAS
npm install sweetalert2 vue-toastification@next



npm install axios

npm install chart.js vue-chartjs