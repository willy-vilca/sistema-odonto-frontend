export interface PatientDocument {
  id: string
  patientId: string
  encounterId: string | null
  tooth: number | null
  categoryId: string
  categoryName: string
  recordedOn: string
  description: string
  fileName: string
  mediaType: string
  byteSize: number
  sha256: string
  actorName: string
  createdAt: string
}
export interface Consent {
  id: string
  patientId: string
  documentId: string
  name: string
  responsible: string
  relationship: string
  signedOn: string
  actorName: string
}
export interface DocumentPolicy {
  maxFileMiB: number
  version: number
  storedBytes: number
  fileCount: number
}
export function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + ' MiB'
    : Math.ceil(bytes / 1024) + ' KiB'
}
