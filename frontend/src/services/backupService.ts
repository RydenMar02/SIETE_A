import api from './api'

export const descargarBackup = () =>
  api.get('/api/backup', {
    responseType: 'blob'
  })