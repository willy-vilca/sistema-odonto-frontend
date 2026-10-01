import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/http'
import type { InstallationState } from '../model/installation'
import { getInstallation } from '../services/installationService'
export function useInstallation() {
  const [state, setState] = useState<InstallationState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getInstallation(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            requestId: error instanceof ApiError ? error.requestId : undefined,
          })
      })
    return () => controller.abort()
  }, [attempt])
  function reload() {
    setState({ status: 'loading' })
    setAttempt((current) => current + 1)
  }
  return { state, reload }
}
