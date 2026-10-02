import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday, formatLocalDate } from '../../../shared/data/dateFormat'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { FormField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import type { Patient } from '../../patients/model/patient'
import type { Consent } from '../model/documents'
import { createConsent, contentUrl } from '../services/documentService'
import { TemplatePicker } from '../../clinical/components/TemplatePicker'
export function ConsentsPanel({
  patient,
  dateFormat,
  timeZone,
}: {
  patient: Patient
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    list = usePagedList<Consent>(
      '/api/v1/documents/consents',
      { patientId: patient.id, direction: 'desc' },
      'signedOn',
    ),
    [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [responsible, setResponsible] = useState(patient.fullName),
    [relationship, setRelationship] = useState('Paciente'),
    [date, setDate] = useState(clinicToday(timeZone)),
    [documents, setDocuments] = useState<PickedEntity[]>([]),
    [templateText, setTemplateText] = useState(''),
    setError = useErrorNotification(),
    form = useSaveForm()
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Consentimientos documentales</h2>
          <p className="mt-2 text-sm text-muted">
            Responsable, fecha y copia del documento conservada. Sin firma electrónica.
          </p>
        </div>
        {auth.can('DOCUMENTS_WRITE') && (
          <Button
            onClick={() => {
              setName('')
              setDocuments([])
              setError('')
              setOpen(true)
            }}
          >
            Registrar consentimiento
          </Button>
        )}
      </header>
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        columns={[
          { label: 'Consentimiento', render: (row) => row.name },
          { label: 'Fecha', render: (row) => formatLocalDate(row.signedOn, dateFormat) },
          { label: 'Responsable', render: (row) => row.responsible + ' · ' + row.relationship },
        ]}
        actions={(row) => (
          <a
            className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-700"
            href={contentUrl(row.documentId, true)}
          >
            Descargar copia
          </a>
        )}
      />
      {open && (
        <Modal title="Registrar consentimiento" busy={form.busy} onClose={() => setOpen(false)}>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              if (!documents[0]) {
                setError('Selecciona la copia adjunta del consentimiento.')
                return
              }
              void form.submit(
                () =>
                  createConsent({
                    patientId: patient.id,
                    documentId: documents[0].id,
                    name,
                    responsible,
                    relationship,
                    signedOn: date,
                  }),
                () => {
                  setOpen(false)
                  list.reload()
                },
              )
            }}
          >
            <FormField
              label="Nombre del consentimiento"
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FormField
              label="Responsable que otorgó el consentimiento"
              required
              maxLength={160}
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
            />
            <FormField
              label="Relación con el paciente"
              required
              maxLength={80}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
            <FormField
              label="Fecha del consentimiento"
              type="date"
              required
              max={clinicToday(timeZone)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <EntityPicker
              label="Copia adjunta"
              source={{
                endpoint: '/api/v1/documents',
                labelKey: 'fileName',
                filters: { patientId: patient.id },
              }}
              selected={documents}
              onChange={setDocuments}
            />
            <p className="text-xs text-muted">
              Adjunta primero la copia firmada en Archivos y luego selecciónala aquí.
            </p>
            {auth.can('CLINICAL_CONFIG_READ') && (
              <TemplatePicker kind="CONSENT" onApply={setTemplateText} />
            )}
            {templateText && (
              <p className="rounded-xl bg-canvas p-4 text-sm whitespace-pre-wrap">{templateText}</p>
            )}
            <Button disabled={form.busy}>Guardar consentimiento</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
