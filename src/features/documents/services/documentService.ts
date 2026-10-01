import { request, saveJson } from '../../../shared/api/http'
import type { PatientDocument } from '../model/documents'
export function uploadDocument(file: File, metadata: unknown) {
  const form = new FormData()
  form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.set('file', file)
  return request<PatientDocument>('/api/v1/documents', { method: 'POST', body: form })
}
export function createConsent(body: unknown) {
  return saveJson('/api/v1/documents/consents', body)
}
export function contentUrl(id: string, download = false) {
  return (
    '/api/v1/documents/' + encodeURIComponent(id) + '/content' + (download ? '?download=true' : '')
  )
}
