import { useState } from 'react'
import { ApiError } from '../api/http'
export function useSaveForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(operation: () => Promise<unknown>, onSaved: () => void) {
    setBusy(true)
    setError('')
    try {
      await operation()
      onSaved()
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo guardar. Revisa la conexión e intenta nuevamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, submit }
}
