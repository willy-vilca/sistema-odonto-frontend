import { useState } from 'react'
import { ApiError } from '../api/http'
import { notify } from '../notifications/notifications'
export function useSaveForm() {
  const [busy, setBusy] = useState(false)
  async function submit(operation: () => Promise<unknown>, onSaved: () => void) {
    setBusy(true)
    try {
      await operation()
      notify('Cambios guardados correctamente.')
      onSaved()
    } catch (e) {
      notify(
        e instanceof ApiError
          ? e.message
          : 'No se pudo guardar. Revisa la conexión e intenta nuevamente.',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }
  return { busy, submit }
}
