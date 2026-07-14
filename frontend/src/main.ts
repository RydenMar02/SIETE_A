import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from "pinia";
import router from './router';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import '@tabler/icons-webfont/dist/tabler-icons.css'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(Toast)

app.mount("#app");