import { request, saveJson, requestBlob } from '../../../shared/api/http'
import type { FinancialDocument, Movement } from '../model/payments'
export const financePost = <T>(path: string, body: unknown) =>
  saveJson<T>('/api/v1/finance/' + path, body)
export async function downloadDocument(document: FinancialDocument) {
  const { blob } = await requestBlob(
    '/api/v1/finance/documents/' + document.id + '/content',
    new AbortController().signal,
  )
  const url = URL.createObjectURL(blob),
    a = window.document.createElement('a')
  a.href = url
  a.download = document.fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function receipt(movement: Movement) {
  return request<FinancialDocument>('/api/v1/finance/documents/receipt/' + movement.id)
}
export async function uploadSupport(id: string, description: string, file: File) {
  const body = new FormData()
  body.append(
    'metadata',
    new Blob([JSON.stringify({ movementId: id, description })], { type: 'application/json' }),
  )
  body.append('file', file)
  return request<FinancialDocument>('/api/v1/finance/documents', { method: 'POST', body })
}

export async function downloadCash(id: string) {
  const { blob } = await requestBlob(
    '/api/v1/finance/cash/' + id + '/report',
    new AbortController().signal,
  )
  const url = URL.createObjectURL(blob),
    a = document.createElement('a')
  a.href = url
  a.download = 'Arqueo-' + id.slice(0, 8) + '.pdf'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
