import { request, saveJson } from '../../../shared/api/http'
import type {
  Encounter,
  EncounterContent,
  ClinicalState,
  Background,
  Odontogram,
} from '../model/clinical'
export function getEncounter(id: string) {
  return request<Encounter>('/api/v1/clinical/encounters/' + id)
}
export function saveEncounter(id: string | undefined, body: unknown) {
  return saveJson<Encounter>(
    '/api/v1/clinical/encounters' + (id ? '/' + id : ''),
    body,
    id ? 'PUT' : 'POST',
  )
}
export function finalizeEncounter(encounter: Encounter) {
  return saveJson<Encounter>('/api/v1/clinical/encounters/' + encounter.id + '/finalize', {
    version: encounter.version,
  })
}
export function correctEncounter(
  encounter: Encounter,
  content: EncounterContent,
  correctionReason: string,
) {
  return saveJson<Encounter>('/api/v1/clinical/encounters/' + encounter.id + '/corrections', {
    version: encounter.version,
    content,
    correctionReason,
  })
}
export function saveState(
  kind: string,
  patientId: string,
  dentistId: string,
  recordedOn: string,
  previousId: string | null,
  reason: string,
  background: Background | null,
  odontogram: Odontogram | null,
) {
  return saveJson<ClinicalState>('/api/v1/clinical/states/' + kind, {
    patientId,
    dentistId,
    recordedOn,
    previousId,
    reason,
    background,
    odontogram,
  })
}
