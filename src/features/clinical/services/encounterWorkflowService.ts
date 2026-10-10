import { request, saveJson } from '../../../shared/api/http'
import type { EncounterStart, CheckoutResult } from '../model/encounterWorkflow'
export function fromAppointment(id: string) {
  return request<EncounterStart>('/api/v1/clinical/from-appointment/' + id)
}
export function checkoutEncounter(id: string, body: unknown) {
  return saveJson<CheckoutResult>('/api/v1/clinical/encounters/' + id + '/checkout', body)
}
