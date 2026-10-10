import type { Encounter, EncounterContent } from './clinical'
import type { Movement } from '../../finance/model/payments'
export interface EncounterDefaults {
  patientId: string
  dentistId: string
  appointmentId: string | null
  attendedOn: string
  reason: string
  content: EncounterContent
  version: number
}
export interface EncounterStart {
  existing: Encounter | null
  defaults: EncounterDefaults | null
  dentistName: string
}
export interface CheckoutPreview {
  currency: string
  amount: number
  individualCharges: number
  includedProcedures: number
  finalized: boolean
}
export interface CheckoutResult {
  encounter: Encounter
  payment: Movement | null
  repeated: boolean
}
