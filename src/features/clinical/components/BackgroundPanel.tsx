import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList, type PageData } from '../../../shared/data/usePagedList'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday, formatLocalDate } from '../../../shared/data/dateFormat'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { TemplatePicker } from './TemplatePicker'
import { saveState } from '../services/clinicalService'
import { emptyBackground, type Background, type ClinicalState } from '../model/clinical'
const labels: Record<keyof Background, string> = {
  antecedents: 'Antecedentes personales y familiares',
  allergies: 'Alergias informadas',
  medications: 'Medicamentos informados',
  anamnesis: 'Anamnesis',
}
export function BackgroundPanel({
  patientId,
  dentistId,
  dateFormat,
  timeZone,
}: {
  patientId: string
  dentistId?: string
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    list = usePagedList<ClinicalState>(
      '/api/v1/clinical/states/BACKGROUND',
      { patientId, direction: 'desc' },
      'createdAt',
    )
  const latest = useQueryData<PageData<ClinicalState>>(
    '/api/v1/clinical/states/BACKGROUND?patientId=' +
      patientId +
      '&sort=createdAt&direction=desc&size=1',
  )
  const [editing, setEditing] = useState(false),
    [selected, setSelected] = useState<ClinicalState>(),
    [background, setBackground] = useState<Background>(emptyBackground),
    [date, setDate] = useState(clinicToday(timeZone)),
    [reason, setReason] = useState('')
  const form = useSaveForm(),
    state = selected ?? latest.data?.items[0]
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Antecedentes y anamnesis</h2>
        {auth.can('CLINICAL_WRITE') && (
          <Button
            disabled={!dentistId || latest.loading || !!latest.error}
            onClick={() => {
              setBackground(latest.data?.items[0]?.background ?? emptyBackground)
              setReason('')
              setDate(clinicToday(timeZone))
              setEditing(true)
            }}
          >
            Actualizar antecedentes
          </Button>
        )}
      </header>
      {latest.error && (
        <p role="alert" className="error-box">
          {latest.error}
        </p>
      )}
      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-5 text-xs text-muted">
          {state
            ? 'Estado del ' +
              formatLocalDate(state.recordedOn, dateFormat) +
              ' · ' +
              state.actorName
            : 'Todavía no hay antecedentes registrados.'}
        </p>
        <dl className="grid gap-5 sm:grid-cols-2">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
                {state?.background?.[key as keyof Background] || 'Sin registrar'}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <h3 className="font-semibold">Historial de antecedentes</h3>
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        columns={[
          { label: 'Fecha', render: (row) => formatLocalDate(row.recordedOn, dateFormat) },
          { label: 'Motivo', render: (row) => row.reason },
          {
            label: 'Responsable',
            render: (row) => [row.dentistName, row.actorName].filter(Boolean).join(' · '),
          },
        ]}
        actions={(row) => (
          <Button variant="quiet" onClick={() => setSelected(row)}>
            Ver estado
          </Button>
        )}
      />
      {editing && (
        <Modal title="Actualizar antecedentes" busy={form.busy} onClose={() => setEditing(false)}>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              void form.submit(
                () =>
                  saveState(
                    'BACKGROUND',
                    patientId,
                    dentistId!,
                    date,
                    latest.data?.items[0]?.id ?? null,
                    reason,
                    background,
                    null,
                  ),
                () => {
                  setEditing(false)
                  setSelected(undefined)
                  latest.reload()
                  list.reload()
                },
              )
            }}
          >
            <FormField
              label="Fecha del registro"
              type="date"
              required
              value={date}
              max={clinicToday(timeZone)}
              onChange={(e) => setDate(e.target.value)}
            />
            {Object.entries(labels).map(([key, label]) => (
              <TextAreaField
                key={key}
                label={label}
                value={background[key as keyof Background]}
                maxLength={key === 'anamnesis' ? 8000 : 4000}
                onChange={(e) => setBackground({ ...background, [key]: e.target.value })}
              />
            ))}
            {auth.can('CLINICAL_CONFIG_READ') && (
              <TemplatePicker
                kind="BACKGROUND"
                onApply={(text) =>
                  setBackground({
                    ...background,
                    anamnesis: [background.anamnesis, text].filter(Boolean).join('\n\n'),
                  })
                }
              />
            )}
            <TextAreaField
              label="Motivo del registro o actualización"
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {form.error && (
              <p role="alert" className="error-box">
                {form.error}
              </p>
            )}
            <Button disabled={form.busy}>Guardar nuevo estado</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
