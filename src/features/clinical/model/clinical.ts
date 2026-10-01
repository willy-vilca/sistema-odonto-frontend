export interface Background {
  antecedents: string
  allergies: string
  medications: string
  anamnesis: string
}
export interface ToothMark {
  tooth: number
  surface: string
  finding: string
  note: string
}
export interface Odontogram {
  marks: ToothMark[]
  notes: string
}
export interface ClinicalState {
  sequence: number
  dentistId: string | null
  dentistName: string | null
  id: string
  patientId: string
  kind: string
  recordedOn: string
  previousId: string | null
  background: Background | null
  odontogram: Odontogram | null
  actorName: string
  reason: string
  createdAt: string
}
export interface Procedure {
  planItemId?: string | null
  unitPrice?: string | null
  serviceId: string | null
  description: string
  quantity: number
  tooth: number | null
}
export interface EncounterContent {
  anamnesis: string
  evolution: string
  diagnoses: string
  indications: string
  procedures: Procedure[]
}
export interface Encounter {
  dentistName: string
  id: string
  patientId: string
  dentistId: string
  appointmentId: string | null
  attendedOn: string
  reason: string
  status: string
  revision: number
  version: number
  content: EncounterContent | null
}
export interface EncounterRevision {
  id: string
  number: number
  patientName: string
  patientCode: string
  birthDate: string | null
  dentistName: string
  attendedOn: string
  reason: string
  content: EncounterContent
  actorName: string
  correctionReason: string
  createdAt: string
}
export interface ClinicalTemplate {
  id: string
  name: string
  kind: string
  content: string
}
export const emptyContent: EncounterContent = {
  anamnesis: '',
  evolution: '',
  diagnoses: '',
  indications: '',
  procedures: [],
}
export const emptyBackground: Background = {
  antecedents: '',
  allergies: '',
  medications: '',
  anamnesis: '',
}
export const findingLabels: Record<string, string> = {
  UNRECORDED: 'Sin registrar',
  HEALTHY: 'Sin hallazgo informado',
  CARIES: 'Caries',
  RESTORATION: 'Restauración',
  MISSING: 'Ausente',
  EXTRACTION: 'Extracción indicada',
  CROWN: 'Corona',
  ROOT_CANAL: 'Tratamiento de conductos',
  OTHER: 'Otro hallazgo',
}
export const surfaceLabels: Record<string, string> = {
  TOOTH: 'Pieza completa',
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Lingual / palatina',
  O: 'Oclusal / incisal',
}
