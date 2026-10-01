export interface Appointment {
  id: string
  patientId: string
  patientName: string
  patientCode: string
  dentistId: string
  dentistName: string
  serviceId: string | null
  serviceName: string
  durationMinutes: number
  gapMinutes: number
  startsAt: string
  endsAt: string
  localStart: string
  localEnd: string
  status: string
  origin: string
  notes: string
  version: number
}
export interface AppointmentDraft {
  patientId: string
  dentistId: string
  serviceId: string | null
  reason: string
  durationMinutes: number | null
  localStart: string
  notes: string
  requestKey: string
}
export interface CalendarResponse {
  items: Appointment[]
  timeZone: string
  from: string
  to: string
}
export interface Slot {
  startsAt: string
  endsAt: string
  localStart: string
  localEnd: string
}
export interface AppointmentHistory {
  id: string
  action: string
  previousStatus: string | null
  status: string
  previousStart: string | null
  startsAt: string
  endsAt: string
  dentistName: string
  durationMinutes: number
  actorName: string
  reason: string
  createdAt: string
}
export const statusLabels: Record<string, string> = {
  RESERVED: 'Reservada',
  CONFIRMED: 'Confirmada',
  WAITING: 'En espera',
  IN_PROGRESS: 'En atención',
  ATTENDED: 'Atendida',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}
export const transitions: Record<string, string[]> = {
  RESERVED: ['CONFIRMED', 'WAITING', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['WAITING', 'CANCELLED', 'NO_SHOW'],
  WAITING: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['ATTENDED'],
  ATTENDED: [],
  CANCELLED: [],
  NO_SHOW: [],
}
export function localTime(value: string) {
  return value.slice(11, 16)
}
