import { saveJson } from '../../../shared/api/http'
import type { Appointment, AppointmentDraft } from '../model/appointment'
export const createAppointment = (draft: AppointmentDraft) =>
  saveJson<Appointment>('/api/v1/appointments', draft)
export const rescheduleAppointment = (
  appointment: Appointment,
  dentistId: string,
  localStart: string,
  useCurrentDuration: boolean,
  reason: string,
) =>
  saveJson<Appointment>(
    '/api/v1/appointments/' + appointment.id + '/reschedule',
    { version: appointment.version, dentistId, localStart, useCurrentDuration, reason },
    'PUT',
  )
export const changeAppointmentStatus = (appointment: Appointment, status: string, reason: string) =>
  saveJson<Appointment>(
    '/api/v1/appointments/' + appointment.id + '/status',
    { version: appointment.version, status, reason },
    'PUT',
  )
