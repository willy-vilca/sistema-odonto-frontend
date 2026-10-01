import { saveJson } from '../../../shared/api/http'
import type { Patient, PatientDraft } from '../model/patient'
export function savePatient(draft: PatientDraft, id?: string) {
  return saveJson<Patient>('/api/v1/patients' + (id ? '/' + id : ''), draft, id ? 'PUT' : 'POST')
}
