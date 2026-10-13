import { useState } from 'react'
import { PatientSelection } from '../../patients/components/PatientSelection'
import { useSoleDentist } from '../../configuration/hooks/useSoleDentist'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { createAppointment } from '../services/appointmentService'
import { AvailabilityPicker } from './AvailabilityPicker'
import type { ScheduledSession } from '../../treatments/model/treatments'
import { request } from '../../../shared/api/http'
import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
export function AppointmentEditor({
  date,
  timeZone,
  initialDentist = [],
  onClose,
  onSaved,
}: {
  date: string
  timeZone: string
  initialDentist?: PickedEntity[]
  onClose: () => void
  onSaved: () => void
}) {
  const [patient, setPatient] = useState<PickedEntity[]>([])
  const [chosenDentist, setDentist] = useState(initialDentist)
  const sole = useSoleDentist()
  const dentist = chosenDentist.length ? chosenDentist : sole.selection
  const [service, setService] = useState<PickedEntity[]>([])
  const [administrative, setAdministrative] = useState(false)
  const [kind, setKind] = useState('catalog'),
    [planSelection, setPlanSelection] = useState<PickedEntity[]>([])
  const [planned, setPlanned] = useState<ScheduledSession>(),
    [loadingPlan, setLoadingPlan] = useState(false)
  const [price, setPrice] = useState(''),
    setError = useErrorNotification()
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState(30)
  const [start, setStart] = useState(date + 'T09:00')
  const [notes, setNotes] = useState('')
  const [requestKey, setRequestKey] = useState(crypto.randomUUID())
  const form = useSaveForm()
  function changed() {
    setRequestKey(crypto.randomUUID())
  }
  return (
    <Modal title="Nueva cita" onClose={onClose} busy={form.busy || loadingPlan}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              createAppointment({
                patientId: patient[0]?.id ?? '',
                dentistId: dentist[0]?.id ?? '',
                serviceId:
                  administrative || kind === 'custom'
                    ? null
                    : kind === 'plan'
                      ? (planned?.serviceId ?? null)
                      : (service[0]?.id ?? null),
                reason:
                  !administrative && kind === 'plan'
                    ? (planned?.description.slice(0, 160) ?? '')
                    : reason,
                durationMinutes:
                  administrative || kind === 'custom'
                    ? duration
                    : kind === 'plan'
                      ? (planned?.durationMinutes ?? 30)
                      : null,
                administrative,
                planItemId: kind === 'plan' && !administrative ? (planned?.itemId ?? null) : null,
                scheduledSessionId:
                  kind === 'plan' && !administrative ? (planned?.id ?? null) : null,
                scheduledSessionVersion:
                  kind === 'plan' && !administrative ? (planned?.version ?? null) : null,
                agreedPrice: kind === 'custom' && !administrative && price ? price : null,
                localStart: start,
                notes,
                requestKey,
              }),
            onSaved,
          )
        }}
      >
        <p className="text-sm text-muted">
          Selecciona a la persona que recibirá la atención. El teléfono familiar no identifica por
          sí solo al paciente.
        </p>
        {sole.error && (
          <p role="alert" className="error-box">
            {sole.error}
          </p>
        )}
        <fieldset disabled={form.busy || loadingPlan} className="space-y-5">
          <PatientSelection
            required
            selected={patient}
            disabled={form.busy}
            onChange={(items) => {
              setPatient(items)
              setPlanSelection([])
              setPlanned(undefined)
              changed()
            }}
          />
          {sole.loading ? (
            <p role="status" className="text-sm text-muted">
              Cargando profesional…
            </p>
          ) : sole.selection.length === 1 && dentist[0]?.id === sole.selection[0].id ? (
            <p className="rounded-xl bg-brand-50 p-3 text-sm">Profesional: {dentist[0].label}</p>
          ) : (
            <EntityPicker
              label="Odontólogo"
              required
              source={{
                endpoint: '/api/v1/dentists',
                labelKey: 'fullName',
                filters: { active: 'true' },
              }}
              selected={dentist}
              onChange={(d) => {
                setDentist(d)
                setService([])
                setPlanSelection([])
                setPlanned(undefined)
                changed()
              }}
              disabled={form.busy}
            />
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={administrative}
              onChange={(e) => {
                setAdministrative(e.target.checked)
                changed()
              }}
            />
            Cita por motivo administrativo
          </label>
          {!administrative && (
            <label className="field-label">
              Tipo de servicio
              <select
                aria-label="Tipo de servicio"
                className="field"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value)
                  setService([])
                  setPlanned(undefined)
                  setPlanSelection([])
                  changed()
                }}
              >
                <option value="catalog">Servicio del catálogo</option>
                <option value="custom">Servicio propio (sin catálogo)</option>
                <option value="plan">Sesión de un tratamiento activo</option>
              </select>
            </label>
          )}
          {administrative ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Motivo de la cita"
                required
                maxLength={160}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  changed()
                }}
              />
              <FormField
                label="Duración (minutos)"
                type="number"
                min={1}
                max={1440}
                required
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value))
                  changed()
                }}
              />
            </div>
          ) : kind === 'custom' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Descripción del servicio propio"
                required
                maxLength={160}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  changed()
                }}
              />
              <FormField
                label="Duración del servicio propio (minutos)"
                type="number"
                required
                min={1}
                max={1440}
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value))
                  changed()
                }}
              />
              <FormField
                label="Precio acordado (opcional)"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  changed()
                }}
              />
            </div>
          ) : kind === 'plan' ? (
            <div className="space-y-3">
              {patient[0] && dentist[0] ? (
                <EntityPicker
                  key={patient[0].id + '-' + dentist[0].id}
                  label="Sesión del tratamiento"
                  required
                  source={{
                    endpoint: '/api/v1/treatment-sessions',
                    labelKey: 'label',
                    filters: {
                      patientId: patient[0].id,
                      dentistId: dentist[0].id,
                      status: 'PENDING',
                    },
                  }}
                  selected={planSelection}
                  onChange={(rows) => {
                    setPlanSelection(rows)
                    setPlanned(undefined)
                    changed()
                    if (rows[0]) {
                      setLoadingPlan(true)
                      void request<ScheduledSession>('/api/v1/treatment-sessions/' + rows[0].id)
                        .then((data) => {
                          setPlanned(data)
                          if (data.plannedOn) setStart(data.plannedOn + 'T09:00')
                        })
                        .catch((error) =>
                          setError(
                            error instanceof Error
                              ? error.message
                              : 'No se pudo consultar la sesión.',
                          ),
                        )
                        .finally(() => setLoadingPlan(false))
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted">
                  Selecciona el paciente y profesional para ver sus sesiones pendientes.
                </p>
              )}
              {planned && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm">
                  {planned.planTitle} · Sesión {planned.sessionNumber} de {planned.totalSessions} ·{' '}
                  {planned.durationMinutes} minutos. Ya incluida en el precio del plan.
                </p>
              )}
            </div>
          ) : dentist.length > 0 ? (
            <EntityPicker
              key={dentist[0].id}
              label="Servicio"
              required
              source={{
                endpoint: '/api/v1/services',
                labelKey: 'name',
                filters: { active: 'true', dentistId: dentist[0].id },
              }}
              selected={service}
              onChange={(s) => {
                setService(s)
                changed()
              }}
              disabled={form.busy}
            />
          ) : (
            <p className="text-xs text-muted">Selecciona un odontólogo para ver sus servicios.</p>
          )}
          <FormField
            label="Inicio de la cita"
            type="datetime-local"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              changed()
            }}
          />
          <p className="text-xs text-muted">
            Horario del consultorio: {timeZone}. El fin se calcula con la duración del servicio.
          </p>
          {dentist.length > 0 &&
            ((administrative && duration > 0) ||
              (kind === 'custom' && duration > 0) ||
              (kind === 'plan' && !!planned) ||
              service.length > 0) &&
            start && (
              <AvailabilityPicker
                dentistId={dentist[0].id}
                serviceId={administrative || kind !== 'catalog' ? null : (service[0]?.id ?? null)}
                duration={
                  !administrative && kind === 'plan'
                    ? (planned?.durationMinutes ?? duration)
                    : duration
                }
                date={start.slice(0, 10)}
                onSelect={(local) => {
                  setStart(local.slice(0, 16))
                  changed()
                }}
              />
            )}
          <TextAreaField
            label="Notas de la cita"
            value={notes}
            maxLength={1000}
            onChange={(e) => {
              setNotes(e.target.value)
              changed()
            }}
          />
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.busy}>
            Cancelar
          </Button>
          <Button
            disabled={
              form.busy ||
              !patient.length ||
              !dentist.length ||
              loadingPlan ||
              (!administrative &&
                ((kind === 'catalog' && !service.length) ||
                  (kind === 'plan' && !planned) ||
                  (kind === 'custom' && !reason.trim())))
            }
          >
            {form.busy ? 'Reservando…' : 'Reservar cita'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
