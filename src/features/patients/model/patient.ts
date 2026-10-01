export interface PatientContact {
  phone: string
  name: string
  relationship: string
  guardian: boolean
  payer: boolean
}
export interface PatientDraft {
  fullName: string
  birthDate: string | null
  documentType: string
  documentNumber: string
  address: string
  email: string
  emergencyName: string
  emergencyPhone: string
  notes: string
  provisional: boolean
  active: boolean
  contacts: PatientContact[]
  version?: number
}
export interface Patient extends PatientDraft {
  id: string
  code: string
  label: string
  version: number
}
export function emptyPatient(): PatientDraft {
  return {
    fullName: '',
    birthDate: null,
    documentType: '',
    documentNumber: '',
    address: '',
    email: '',
    emergencyName: '',
    emergencyPhone: '',
    notes: '',
    provisional: false,
    active: true,
    contacts: [{ phone: '', name: '', relationship: 'Paciente', guardian: false, payer: true }],
  }
}
export function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, '').replace(/^00/, '+')
}
