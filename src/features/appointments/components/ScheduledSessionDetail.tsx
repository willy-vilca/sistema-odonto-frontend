import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveJson } from '../../../shared/api/http'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useAuth } from '../../auth/hooks/useAuth'
import { formatLocalDate, clinicToday } from '../../../shared/data/dateFormat'
import type { ScheduledSession } from '../../treatments/model/treatments'
import type { Appointment } from '../model/appointment'
import { AvailabilityPicker } from './AvailabilityPicker'
import { AppointmentContacts } from './AppointmentContacts'
export function ScheduledSessionById({
  id,
  timeZone,
  dateFormat,
  onClose,
  onChanged,
  onAssigned,
}: {
  id: string
  timeZone: string
  dateFormat: string
  onClose: () => void
  onChanged: () => void
  onAssigned?: (appointment: Appointment) => void
}) {
  const result = useQueryData<ScheduledSession>('/api/v1/treatment-sessions/' + id)
  if (result.data)
    return (
      <ScheduledSessionDetail
        key={id + '-' + result.data.version}
        session={result.data}
        timeZone={timeZone}
        dateFormat={dateFormat}
        onClose={onClose}
        onChanged={() => {
          result.reload()
          onChanged()
        }}
        onAssigned={onAssigned}
      />
    )
  return (
    <Modal title="Sesión de tratamiento" onClose={onClose}>
      <p
        role={result.error ? 'alert' : 'status'}
        className={result.error ? 'error-box' : 'text-sm'}
      >
        {result.error || 'Consultando sesión…'}
      </p>
    </Modal>
  )
}
export function ScheduledSessionDetail({
  session,
  timeZone,
  dateFormat,
  onClose,
  onChanged,
  onAssigned,
}: {
  session: ScheduledSession
  timeZone: string
  dateFormat: string
  onClose: () => void
  onChanged: () => void
  onAssigned?: (appointment: Appointment) => void
}) {
  const auth = useAuth(),
    form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID())
  const [day, setDay] = useState(session.plannedOn ?? clinicToday(timeZone)),
    [hour, setHour] = useState(''),
    [changing, setChanging] = useState(false),
    [reason, setReason] = useState('Coordinación con el paciente')
  return (
    <Modal
      title={'Sesión ' + session.sessionNumber + ' · ' + session.description}
      onClose={onClose}
      busy={form.busy}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold">{session.patientName}</p>
          <p className="mt-1 text-sm">
            {session.planCode} · {session.planTitle}
          </p>
          <p className="mt-2 text-sm">
            {session.dentistName} · {session.durationMinutes} minutos · Sesión{' '}
            {session.sessionNumber} de {session.totalSessions}
          </p>
          <p className="mt-2 font-medium">
            {session.plannedOn
              ? formatLocalDate(session.plannedOn, dateFormat)
              : 'Fecha por coordinar'}{' '}
            ·{' '}
            {session.status === 'PENDING'
              ? 'Hora pendiente'
              : session.status === 'COMPLETED'
                ? 'Realizada'
                : session.status === 'CANCELLED'
                  ? 'Cancelada'
                  : 'Con cita reservada'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {auth.can('PATIENTS_READ') && (
            <Link
              className="inline-flex min-h-11 items-center font-semibold text-brand-700"
              to={'/pacientes?patientId=' + session.patientId}
            >
              Ver ficha y contacto
            </Link>
          )}
          {auth.can('PLANS_READ') && (
            <Link
              className="inline-flex min-h-11 items-center font-semibold text-brand-700"
              to={'/tratamientos?patientId=' + session.patientId}
            >
              Ver tratamiento
            </Link>
          )}
        </div>
        <AppointmentContacts patientId={session.patientId} />
        {session.status === 'PENDING' && auth.can('APPOINTMENTS_WRITE') && (
          <>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void form.submit(
                  () =>
                    saveJson<Appointment>(`/api/v1/treatment-sessions/${session.id}/assign`, {
                      localStart: day + 'T' + hour,
                      version: session.version,
                      requestKey: key,
                    }),
                  (appointment) => {
                    onChanged()
                    onClose()
                    onAssigned?.(appointment)
                  },
                )
              }}
            >
              <FormField
                label="Día de la sesión"
                type="date"
                required
                value={day}
                onChange={(e) => {
                  setDay(e.target.value)
                  setHour('')
                }}
              />
              <FormField
                label="Hora de la sesión"
                type="time"
                required
                value={hour}
                onChange={(e) => setHour(e.target.value)}
              />
              <p className="text-sm text-muted">
                Al asignar la hora se comprobará el intervalo completo. Las sesiones del plan no
                generan un nuevo cargo por cada visita.
              </p>
              {day && (
                <AvailabilityPicker
                  dentistId={session.dentistId}
                  serviceId={null}
                  duration={session.durationMinutes}
                  date={day}
                  onSelect={(value) => setHour(value.slice(11, 16))}
                />
              )}
              <Button disabled={form.busy || !hour}>Asignar hora y reservar cita</Button>
            </form>
            <Button variant="quiet" disabled={form.busy} onClick={() => setChanging(!changing)}>
              {changing ? 'Volver a asignar hora' : 'Cambiar solo la fecha prevista'}
            </Button>
            {changing && (
              <form
                className="space-y-3 rounded-xl border border-line p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void form.submit(
                    () =>
                      saveJson<ScheduledSession>(
                        `/api/v1/treatment-sessions/${session.id}/date`,
                        { plannedOn: day, version: session.version, reason },
                        'PUT',
                      ),
                    () => {
                      onChanged()
                      onClose()
                    },
                  )
                }}
              >
                <TextAreaField
                  label="Motivo del cambio de fecha"
                  required
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button disabled={form.busy}>Guardar fecha sin reservar hora</Button>
              </form>
            )}
          </>
        )}
        {session.appointmentId && (
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-brand-700"
            to={'/agenda?appointment=' + session.appointmentId}
          >
            Ver cita
          </Link>
        )}
      </div>
    </Modal>
  )
}
