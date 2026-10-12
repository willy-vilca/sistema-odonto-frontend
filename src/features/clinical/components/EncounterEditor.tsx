import { useState } from 'react'
import type { EncounterDefaults } from '../model/encounterWorkflow'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday } from '../../../shared/data/dateFormat'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { ProcedureEditor } from './ProcedureEditor'
import { saveEncounter, correctEncounter } from '../services/clinicalService'
import { emptyContent, type Encounter, type EncounterContent } from '../model/clinical'
export function EncounterEditor({
  mode,
  encounter,
  defaults,
  patientId,
  dentist,
  timeZone,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit' | 'correction'
  encounter?: Encounter
  defaults?: EncounterDefaults
  patientId: string
  dentist?: PickedEntity
  timeZone: string
  onClose: () => void
  onSaved: (record: Encounter) => void
}) {
  const form = useSaveForm(),
    [date, setDate] = useState(
      encounter?.attendedOn ?? defaults?.attendedOn ?? clinicToday(timeZone),
    ),
    [reason, setReason] = useState(encounter?.reason ?? defaults?.reason ?? ''),
    [correction, setCorrection] = useState(''),
    [content, setContent] = useState<EncounterContent>(
      encounter?.content ?? defaults?.content ?? emptyContent,
    ),
    [appointments, setAppointments] = useState<PickedEntity[]>(
      (encounter?.appointmentId ?? defaults?.appointmentId)
        ? [{ id: (encounter?.appointmentId ?? defaults?.appointmentId)!, label: 'Cita vinculada' }]
        : [],
    )
  const professionalId = encounter?.dentistId ?? defaults?.dentistId ?? dentist?.id,
    correcting = mode === 'correction'
  return (
    <Modal
      title={
        correcting ? 'Registrar corrección' : mode === 'new' ? 'Nueva atención' : 'Editar borrador'
      }
      onClose={onClose}
      busy={form.busy}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              correcting
                ? correctEncounter(encounter!, content, correction)
                : saveEncounter(encounter?.id, {
                    patientId,
                    dentistId: professionalId,
                    appointmentId: appointments[0]?.id ?? null,
                    attendedOn: date,
                    reason,
                    content,
                    version: encounter?.version ?? 0,
                  }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {correcting
            ? 'Se guardará una nueva versión. El registro original seguirá disponible.'
            : 'Responsable: ' +
              (encounter?.dentistName ?? dentist?.label ?? 'Profesional de la atención') +
              '. Puedes atender sin cita para un ingreso directo.'}
        </p>
        {!correcting && (
          <details className="rounded-xl border border-line p-4 space-y-4">
            <summary className="cursor-pointer font-medium">Fecha, motivo y cita vinculada</summary>
            <FormField
              label="Fecha de atención"
              type="date"
              required
              max={clinicToday(timeZone)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextAreaField
              label="Motivo de consulta"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <EntityPicker
              label="Cita (opcional)"
              source={{
                endpoint: '/api/v1/appointments',
                labelKey: 'localStart',
                filters: {
                  patientId,
                  dentistId: professionalId ?? '',
                  sort: 'startsAt',
                  direction: 'desc',
                },
              }}
              selected={appointments}
              onChange={setAppointments}
            />
          </details>
        )}
        <ProcedureEditor
          patientId={patientId}
          dentistId={professionalId ?? ''}
          correcting={correcting}
          value={content.procedures}
          onChange={(procedures) => setContent({ ...content, procedures })}
        />
        <details
          className="rounded-xl border border-line p-4 space-y-4"
          open={correcting || undefined}
        >
          <summary className="cursor-pointer font-medium">Notas clínicas (opcionales)</summary>
          <p className="text-sm text-muted">
            Puedes finalizar y cobrar solo los servicios realizados. Estas notas pueden quedar
            vacías.
          </p>
          {(['evolution', 'diagnoses', 'indications'] as const).map((key, index) => (
            <TextAreaField
              key={key}
              label={['Evolución', 'Diagnósticos', 'Indicaciones'][index]}
              maxLength={8000}
              value={content[key]}
              onChange={(e) => setContent({ ...content, [key]: e.target.value })}
            />
          ))}
        </details>
        {correcting && (
          <TextAreaField
            label="Motivo de la corrección"
            required
            maxLength={500}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy || !professionalId}>
            {correcting ? 'Guardar corrección' : 'Guardar atención'}
          </Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
