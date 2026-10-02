import { useCallback } from 'react'
import { notify } from './notifications'
export function useErrorNotification() {
  return useCallback((message: string) => {
    if (message) notify(message, 'error')
  }, [])
}
