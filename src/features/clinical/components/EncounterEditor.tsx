import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday } from '../../../shared/data/dateFormat'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { TemplatePicker } from './TemplatePicker'
import { ProcedureEditor } from './ProcedureEditor'
import { saveEncounter, correctEncounter } from '../services/clinicalService'
import { emptyContent, type Encounter, type EncounterContent } from '../model/clinical'
export function EncounterEditor({
  mode,
  encounter,
  patientId,
  dentist,
  timeZone,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit' | 'correction'
  encounter?: Encounter
  patientId: string
  dentist?: PickedEntity
  timeZone: string
  onClose: () => void
  onSaved: () => void
}) {
  const auth = useAuth(),
    form = useSaveForm(),
    [date, setDate] = useState(encounter?.attendedOn ?? clinicToday(timeZone)),
    [reason, setReason] = useState(encounter?.reason ?? ''),
    [correction, setCorrection] = useState(''),
    [content, setContent] = useState<EncounterContent>(encounter?.content ?? emptyContent),
    [appointments, setAppointments] = useState<PickedEntity[]>(
      encounter?.appointmentId ? [{ id: encounter.appointmentId, label: 'Cita vinculada' }] : [],
    )
  const professionalId = encounter?.dentistId ?? dentist?.id,
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
          <>
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
              required
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
          </>
        )}
        {(['anamnesis', 'evolution', 'diagnoses', 'indications'] as const).map((key, index) => (
          <TextAreaField
            key={key}
            label={['Anamnesis', 'Evolución', 'Diagnósticos', 'Indicaciones'][index]}
            required={correcting && ['evolution', 'diagnoses'].includes(key)}
            maxLength={8000}
            value={content[key]}
            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
          />
        ))}
        {auth.can('CLINICAL_CONFIG_READ') && (
          <TemplatePicker
            kind="ENCOUNTER"
            onApply={(text) =>
              setContent({
                ...content,
                anamnesis: [content.anamnesis, text].filter(Boolean).join('\n\n'),
              })
            }
          />
        )}
        <ProcedureEditor
          patientId={patientId}
          dentistId={professionalId ?? ''}
          correcting={correcting}
          value={content.procedures}
          onChange={(procedures) => setContent({ ...content, procedures })}
        />
        {correcting && (
          <TextAreaField
            label="Motivo de la corrección"
            required
            maxLength={500}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
        )}
        {form.error && (
          <p role="alert" className="error-box">
            {form.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy || !professionalId}>
            {correcting ? 'Guardar corrección' : 'Guardar borrador'}
          </Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
