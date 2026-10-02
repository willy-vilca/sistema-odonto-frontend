import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { EntityPicker } from '../../../shared/ui/EntityPicker'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { formatLocalDate, dateLocale } from '../../../shared/data/dateFormat'
import { useAuth } from '../../auth/hooks/useAuth'
import { AppointmentBadge } from './AppointmentList'
import { AvailabilityPicker } from './AvailabilityPicker'
import { changeAppointmentStatus, rescheduleAppointment } from '../services/appointmentService'
import {
  localTime,
  statusLabels,
  transitions,
  type Appointment,
  type AppointmentHistory,
} from '../model/appointment'
const historyLabels: Record<string, string> = {
  CREATED: 'Reserva',
  RESCHEDULED: 'Reprogramación',
  STATUS_CHANGED: 'Cambio de estado',
  CANCELLED: 'Cancelación',
}
function History({
  appointment,
  dateFormat,
  timeZone,
}: {
  appointment: Appointment
  dateFormat: string
  timeZone: string
}) {
  const [action, setAction] = useState('')
  const list = usePagedList<AppointmentHistory>(
    '/api/v1/appointments/' + appointment.id + '/history',
    { direction: 'desc', action },
    'createdAt',
  )
  const instant = (value: string) =>
    new Intl.DateTimeFormat(dateLocale(dateFormat), {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(value))
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Historial de la cita</h2>
      <PagedTable
        list={list}
        filters={
          <label className="field-label">
            Movimiento
            <select className="field" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Todos los movimientos</option>
              {Object.entries(historyLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        }
        keyFor={(h) => h.id}
        columns={[
          {
            label: 'Movimiento',
            render: (h) => (
              <>
                <p className="font-medium">{historyLabels[h.action]}</p>
                <p className="mt-1 text-xs text-muted">
                  {instant(h.createdAt)} · {h.actorName}
                </p>
              </>
            ),
          },
          {
            label: 'Reserva registrada',
            render: (h) => (
              <>
                <p>
                  {instant(h.startsAt)} · {h.durationMinutes} min
                </p>
                <p className="text-xs text-muted">
                  {h.dentistName} · {statusLabels[h.status]}
                </p>
                {h.previousStart && h.previousStart !== h.startsAt && (
                  <p className="mt-1 text-xs text-muted">Antes: {instant(h.previousStart)}</p>
                )}
              </>
            ),
          },
          { label: 'Motivo', render: (h) => h.reason || '—' },
        ]}
      />
      <p className="text-xs text-muted">Fechas de la reserva expresadas en {timeZone}.</p>
    </div>
  )
}
export function AppointmentDetail({
  appointment,
  onClose,
  onChanged,
  dateFormat = 'DMY',
  timeZone,
}: {
  appointment: Appointment
  onClose: () => void
  onChanged: () => void
  dateFormat?: string
  timeZone: string
}) {
  const [current, setCurrent] = useState(appointment)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'status'>('view')
  const [dentist, setDentist] = useState([
    { id: appointment.dentistId, label: appointment.dentistName },
  ])
  const [start, setStart] = useState(appointment.localStart.slice(0, 16))
  const [useDuration, setUseDuration] = useState(false)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('CONFIRMED')
  const form = useSaveForm()
  const auth = useAuth()
  return (
    <Modal title="Detalle de la cita" onClose={onClose} busy={form.busy}>
      <div className="space-y-6">
        <div className="rounded-xl bg-brand-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{current.patientName}</h2>
              <p className="mt-1 text-xs text-muted">
                {current.patientCode} · {current.dentistName}
              </p>
            </div>
            <AppointmentBadge status={current.status} />
          </div>
          <p className="mt-4 font-medium">{current.serviceName}</p>
          <p className="mt-1 text-sm">
            {formatLocalDate(current.localStart.slice(0, 10), dateFormat)} ·{' '}
            {localTime(current.localStart)}–{localTime(current.localEnd)} ·{' '}
            {current.durationMinutes} min
          </p>
          <p className="mt-2 text-xs text-muted">
            Origen: {current.origin === 'MANUAL' ? 'Recepción' : 'WhatsApp'} · Zona horaria:{' '}
            {timeZone}
          </p>
          {current.notes && <p className="mt-3 text-sm whitespace-pre-wrap">{current.notes}</p>}
        </div>
        {mode === 'view' ? (
          <>
            {auth.can('APPOINTMENTS_WRITE') && (
              <div className="flex flex-wrap gap-3">
                {['RESERVED', 'CONFIRMED'].includes(current.status) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode('reschedule')
                      setReason('')
                    }}
                  >
                    Reprogramar cita
                  </Button>
                )}
                {transitions[current.status].length > 0 && (
                  <Button
                    onClick={() => {
                      setStatus(transitions[current.status][0])
                      setMode('status')
                      setReason('')
                    }}
                  >
                    Cambiar estado
                  </Button>
                )}
              </div>
            )}
            <History
              key={current.version}
              appointment={current}
              dateFormat={dateFormat}
              timeZone={timeZone}
            />
          </>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void form.submit(
                async () => {
                  const updated =
                    mode === 'reschedule'
                      ? await rescheduleAppointment(
                          current,
                          dentist[0]?.id ?? '',
                          start,
                          useDuration,
                          reason,
                        )
                      : await changeAppointmentStatus(current, status, reason)
                  setCurrent(updated)
                },
                () => {
                  setMode('view')
                  onChanged()
                },
              )
            }}
          >
            <fieldset disabled={form.busy} className="space-y-4">
              {mode === 'reschedule' ? (
                <>
                  <h2 className="font-semibold">Reprogramar sin perder la reserva actual</h2>
                  <p className="text-sm text-muted">
                    La reserva original se conserva si el nuevo intervalo no está disponible. La
                    cita volverá a quedar reservada para confirmar su nuevo horario.
                  </p>
                  <EntityPicker
                    label="Odontólogo"
                    source={{
                      endpoint: '/api/v1/dentists',
                      labelKey: 'fullName',
                      filters: { active: 'true' },
                    }}
                    selected={dentist}
                    onChange={setDentist}
                    disabled={form.busy}
                  />
                  <FormField
                    label="Nuevo inicio"
                    type="datetime-local"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                  {current.serviceId && (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={useDuration}
                        onChange={(e) => setUseDuration(e.target.checked)}
                      />
                      Usar la duración actual del catálogo
                    </label>
                  )}
                  <p className="text-xs text-muted">
                    Por defecto se conservan los {current.durationMinutes} minutos de la reserva.
                  </p>
                  {dentist.length > 0 && start && (
                    <AvailabilityPicker
                      appointmentId={current.id}
                      dentistId={dentist[0].id}
                      serviceId={useDuration ? current.serviceId : null}
                      duration={current.durationMinutes}
                      date={start.slice(0, 10)}
                      onSelect={(local) => setStart(local.slice(0, 16))}
                    />
                  )}
                </>
              ) : (
                <label className="field-label">
                  Nuevo estado
                  <select
                    className="field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {transitions[current.status].map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <FormField
                label="Motivo del cambio"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </fieldset>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={form.busy}
                onClick={() => setMode('view')}
              >
                Volver al detalle
              </Button>
              <Button disabled={form.busy || (mode === 'reschedule' && !dentist.length)}>
                {form.busy
                  ? 'Guardando…'
                  : mode === 'reschedule'
                    ? 'Guardar nuevo horario'
                    : 'Guardar estado'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
