import { useEffect, useState } from 'react'
import { request, errorMessage } from '../api/http'
export interface PageData<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export function usePagedList<T>(
  endpoint: string,
  filters: Record<string, string> = {},
  sort = 'name',
) {
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [size, setSize] = useState(20),
    [revision, setRevision] = useState(0)
  const filterKey = JSON.stringify(filters),
    pageScope = endpoint + '|' + filterKey + '|' + size + '|' + debounced
  const [position, setPosition] = useState({ scope: pageScope, page: 0 })
  const page = position.scope === pageScope ? position.page : 0
  function setPage(page: number) {
    setPosition({ scope: pageScope, page })
  }
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    search: debounced,
    sort,
    ...(JSON.parse(filterKey) as Record<string, string>),
  })
  for (const [key, value] of [...params]) if (value === '') params.delete(key)
  const url = endpoint + '?' + params,
    requestKey = url + '|' + revision
  const [result, setResult] = useState<{ key: string; data: PageData<T> | null; error: string }>({
    key: '',
    data: null,
    error: '',
  })
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => {
    const controller = new AbortController()
    void request<PageData<T>>(url, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data, error: '' })
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, data: null, error: errorMessage(e) })
      })
    return () => controller.abort()
  }, [url, requestKey])
  return {
    data: result.data,
    loading: result.key !== requestKey,
    error: result.key === requestKey ? result.error : '',
    search,
    setSearch,
    page,
    setPage,
    size,
    setSize,
    reload: () => setRevision((v) => v + 1),
  }
}
