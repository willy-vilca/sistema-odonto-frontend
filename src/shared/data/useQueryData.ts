import { useEffect, useState } from 'react'
import { request } from '../api/http'
export function useQueryData<T>(url: string) {
  const [revision, setRevision] = useState(0)
  const key = url + '#' + revision
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    request<T>(url, { signal: controller.signal })
      .then((data) => setResult({ key, data }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error: e instanceof Error ? e.message : 'No se pudo consultar la información.',
          })
      })
    return () => controller.abort()
  }, [url, key])
  return {
    data: result.key === key ? result.data : undefined,
    error: result.key === key ? result.error : undefined,
    loading: result.key !== key,
    reload: () => setRevision((n) => n + 1),
  }
}
