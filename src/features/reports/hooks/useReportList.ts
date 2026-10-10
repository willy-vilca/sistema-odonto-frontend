import { usePagedList } from '../../../shared/data/usePagedList'
import type { ReportDefinition, ReportPage, ReportRow } from '../model/reports'

export function useReportList(
  definition: ReportDefinition,
  params: URLSearchParams,
  onChange: (values: Record<string, string>) => void,
) {
  const allowed = [
    'from',
    'to',
    'dentistId',
    'patientId',
    'currency',
    'status',
    'method',
    'includeEarlier',
  ]
  const filters = Object.fromEntries(allowed.map((key) => [key, params.get(key) || '']))
  filters.direction =
    params.get('direction') || (definition.defaultSort === 'patient' ? 'asc' : 'desc')
  const size = Number(params.get('size'))
  const page = Number(params.get('page'))
  const list = usePagedList<ReportRow>(
    `/api/v1/reports/${definition.type}`,
    filters,
    params.get('sort') || definition.defaultSort,
    0,
    {
      search: params.get('search') || '',
      size: [10, 20, 50, 100].includes(size) ? size : 20,
      page: Number.isSafeInteger(page) && page >= 0 ? page : 0,
    },
  )
  return {
    ...list,
    report: list.data as ReportPage | null,
    setSearch: (action: string | ((previous: string) => string)) => {
      const search = typeof action === 'function' ? action(list.search) : action
      list.setSearch(search)
      onChange({ search, page: '' })
    },
    setPage: (page: number) => {
      list.setPage(page)
      onChange({ page: String(page) })
    },
    setSize: (action: number | ((previous: number) => number)) => {
      const size = typeof action === 'function' ? action(list.size) : action
      list.setSize(size)
      onChange({ size: String(size), page: '' })
    },
  }
}
