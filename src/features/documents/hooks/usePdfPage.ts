import { useEffect, useState } from 'react'
import { requestBlob, errorMessage } from '../../../shared/api/http'
export function usePdfPage(id: string, page: number) {
  const [result, setResult] = useState<{
    key: string
    url?: string
    pages: number
    error?: string
  }>({ key: '', pages: 1 })
  const key = id + ':' + page
  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    void requestBlob(
      '/api/v1/documents/' + encodeURIComponent(id) + '/preview?page=' + page,
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(data.blob)
        setResult({ key, url, pages: data.pages })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, pages: 1, error: errorMessage(error) })
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, page, key])
  return { ...result, loading: result.key !== key }
}
