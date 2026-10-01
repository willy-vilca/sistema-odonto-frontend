import { useState } from 'react'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { useQueryData } from '../../../shared/data/useQueryData'
import { clinicToday } from '../../../shared/data/dateFormat'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { uploadDocument } from '../services/documentService'
import type { DocumentPolicy } from '../model/documents'
import { useAuth } from '../../auth/hooks/useAuth'
export function DocumentUpload({
  patientId,
  timeZone,
  onClose,
  onSaved,
}: {
  patientId: string
  timeZone: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    auth = useAuth(),
    policy = useQueryData<DocumentPolicy>('/api/v1/documents/policy'),
    [file, setFile] = useState<File>(),
    [category, setCategory] = useState<PickedEntity[]>([]),
    [encounter, setEncounter] = useState<PickedEntity[]>([]),
    [date, setDate] = useState(clinicToday(timeZone)),
    [description, setDescription] = useState(''),
    [tooth, setTooth] = useState(''),
    [error, setError] = useState('')
  return (
    <Modal title="Adjuntar archivo" busy={form.busy} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          if (!file || !category[0]) {
            setError('Selecciona un archivo y su categoría.')
            return
          }
          if (file.size > (policy.data?.maxFileMiB ?? 20) * 1024 * 1024) {
            setError('El archivo supera el límite permitido.')
            return
          }
          void form.submit(
            () =>
              uploadDocument(file, {
                patientId,
                categoryId: category[0].id,
                encounterId: encounter[0]?.id ?? null,
                tooth: tooth ? Number(tooth) : null,
                recordedOn: date,
                description,
              }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          JPG/JPEG, PNG, WebP o PDF · Hasta {policy.data?.maxFileMiB ?? 20} MiB. Se conserva el
          archivo original.
        </p>
        <FormField
          label="Archivo"
          type="file"
          required
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        <EntityPicker
          label="Categoría documental"
          source={{
            endpoint: '/api/v1/documents/categories',
            labelKey: 'name',
            filters: { active: 'true' },
          }}
          selected={category}
          onChange={setCategory}
        />
        <FormField
          label="Fecha del estudio o documento"
          type="date"
          required
          max={clinicToday(timeZone)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextAreaField
          label="Descripción"
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormField
          label="Pieza FDI (opcional)"
          type="number"
          min={11}
          max={85}
          value={tooth}
          onChange={(e) => setTooth(e.target.value)}
        />
        {auth.can('CLINICAL_READ') && (
          <EntityPicker
            label="Atención vinculada (opcional)"
            source={{
              endpoint: '/api/v1/clinical/encounters',
              labelKey: 'reason',
              filters: { patientId },
            }}
            selected={encounter}
            onChange={setEncounter}
          />
        )}
        {(error || form.error) && (
          <p role="alert" className="error-box">
            {error || form.error}
          </p>
        )}
        <Button disabled={form.busy || policy.loading || !!policy.error}>Guardar archivo</Button>
        {policy.error && (
          <p role="alert" className="error-box">
            {policy.error}
          </p>
        )}
      </form>
    </Modal>
  )
}
