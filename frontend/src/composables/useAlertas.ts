import Swal, { type SweetAlertResult, type SweetAlertIcon } from 'sweetalert2'
import { useToast } from 'vue-toastification'

export function useAlertas () {
  const toast = useToast()

  const makeToast = (
    mensaje: string,
    tipo: 'success' | 'error' | 'info' | 'warning'
  ) => {
    toast[tipo](mensaje)
  }

  const makeConfirm = (titulo: string, texto: string): Promise<SweetAlertResult> => {
    return Swal.fire({
      title: titulo,
      text: texto,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      scrollbarPadding: false,
      confirmButtonColor: '#4F4F75',
      cancelButtonColor: '#FF5733'
    })
  }

  // Para avisos que necesitan más presencia que un toast (ej: "falta seleccionar
  // la empresa antes de continuar"), pero que no piden confirmación del usuario.
  const makeAlert = (
    titulo: string,
    texto: string,
    icono: SweetAlertIcon = 'warning'
  ): Promise<SweetAlertResult> => {
    return Swal.fire({ icon: icono, title: titulo, text: texto })
  }

  return { makeToast, makeConfirm, makeAlert }
}