import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { createAppointment } from '../services/appointmentService'
import { AvailabilityPicker } from './AvailabilityPicker'
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
  const [dentist, setDentist] = useState(initialDentist)
  const [service, setService] = useState<PickedEntity[]>([])
  const [administrative, setAdministrative] = useState(false)
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
    <Modal title="Nueva cita" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              createAppointment({
                patientId: patient[0]?.id ?? '',
                dentistId: dentist[0]?.id ?? '',
                serviceId: administrative ? null : (service[0]?.id ?? null),
                reason,
                durationMinutes: administrative ? duration : null,
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
        <fieldset disabled={form.busy} className="space-y-5">
          <EntityPicker
            label="Paciente"
            source={{
              endpoint: '/api/v1/patients',
              labelKey: 'label',
              filters: { active: 'true' },
            }}
            selected={patient}
            onChange={(p) => {
              setPatient(p)
              changed()
            }}
            disabled={form.busy}
          />
          <EntityPicker
            label="Odontólogo"
            source={{
              endpoint: '/api/v1/dentists',
              labelKey: 'fullName',
              filters: { active: 'true' },
            }}
            selected={dentist}
            onChange={(d) => {
              setDentist(d)
              setService([])
              changed()
            }}
            disabled={form.busy}
          />
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
          ) : dentist.length > 0 ? (
            <EntityPicker
              key={dentist[0].id}
              label="Servicio"
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
            ((administrative && duration > 0) || service.length > 0) &&
            start && (
              <AvailabilityPicker
                dentistId={dentist[0].id}
                serviceId={administrative ? null : service[0].id}
                duration={duration}
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
        {form.error && (
          <p className="error-box" role="alert">
            {form.error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.busy}>
            Cancelar
          </Button>
          <Button
            disabled={
              form.busy ||
              !patient.length ||
              !dentist.length ||
              (!administrative && !service.length)
            }
          >
            {form.busy ? 'Reservando…' : 'Reservar cita'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
