import { useState } from 'react'
import { ApiError } from '../api/http'
import { notify } from '../notifications/notifications'
export function useSaveForm() {
  const [busy, setBusy] = useState(false)
  async function submit<T>(operation: () => Promise<T>, onSaved: (result: T) => void) {
    setBusy(true)
    try {
      const result = await operation()
      notify('Cambios guardados correctamente.')
      onSaved(result)
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
