import { downloadFile } from '../../../shared/api/http'
import type { ReportDefinition } from '../model/reports'

export function exportReport(
  definition: ReportDefinition,
  filters: URLSearchParams,
  format: 'CSV' | 'PDF',
) {
  const params = new URLSearchParams(filters)
  for (const key of ['type', 'page', 'size', 'dentistName', 'patientName']) params.delete(key)
  params.set('format', format)
  return downloadFile(
    `/api/v1/reports/${definition.type}/export?${params}`,
    `reporte-${definition.type.toLowerCase()}-${params.get('from') || ''}-${params.get('to') || ''}.${format.toLowerCase()}`,
  )
}
export function downloadReportDocument(id: string) {
  return downloadFile(`/api/v1/finance/documents/${id}/content`, 'constancia.pdf')
}
