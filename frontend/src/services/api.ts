import axios from 'axios'
import { useSesionStore } from '@/stores/useSesionStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

// Interceptor: agrega el token a TODAS las peticiones automáticamente.
// Antes cada función tenía que armar `{ headers: { Authorization: ... } }`
// a mano; con esto, cualquier service nuevo lo obtiene gratis.
api.interceptors.request.use((config) => {
  const sesion = useSesionStore()
  if (sesion.token) {
    config.headers.Authorization = `Bearer ${sesion.token}`
  }
  return config
})

export default api