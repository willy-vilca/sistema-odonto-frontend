import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { FormField } from '../../../shared/ui/FormField'
import { fileSize, type PatientDocument } from '../model/documents'
import { DocumentUpload } from './DocumentUpload'
import { DocumentViewer } from './DocumentViewer'
export function DocumentsPanel({
  patientId,
  dateFormat,
  timeZone,
}: {
  patientId: string
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    [category, setCategory] = useState<PickedEntity[]>([]),
    [type, setType] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [tooth, setTooth] = useState(''),
    [upload, setUpload] = useState(false),
    [view, setView] = useState<PatientDocument[]>(),
    [photos, setPhotos] = useState<PatientDocument[]>([])
  const list = usePagedList<PatientDocument>(
    '/api/v1/documents',
    {
      patientId,
      categoryId: category[0]?.id ?? '',
      mediaType: type,
      from,
      to,
      tooth,
      direction: 'desc',
    },
    'recordedOn',
  )
  function toggle(document: PatientDocument) {
    setPhotos(
      photos.some((photo) => photo.id === document.id)
        ? photos.filter((photo) => photo.id !== document.id)
        : [...photos, document].slice(-2),
    )
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Archivos del paciente</h2>
          <p className="mt-2 text-sm text-muted">
            Estudios, fotografías y documentos originales organizados por fecha.
          </p>
        </div>
        {auth.can('DOCUMENTS_WRITE') && (
          <Button onClick={() => setUpload(true)}>Adjuntar archivo</Button>
        )}
      </header>
      <section className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <EntityPicker
          label="Filtrar categoría"
          source={{ endpoint: '/api/v1/documents/categories', labelKey: 'name' }}
          selected={category}
          onChange={setCategory}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <FormField label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormField
            label="Pieza FDI"
            type="number"
            min={11}
            max={85}
            value={tooth}
            onChange={(e) => setTooth(e.target.value)}
          />
        </div>
      </section>
      {photos.length > 0 && (
        <section className="space-y-3 rounded-xl border border-line bg-brand-50 p-4">
          <p className="text-sm">
            Fotografías seleccionadas:{' '}
            {photos
              .map(
                (photo) =>
                  photo.fileName + ' (' + formatLocalDate(photo.recordedOn, dateFormat) + ')',
              )
              .join(' · ')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={photos.length !== 2} onClick={() => setView(photos)}>
              Comparar fotografías
            </Button>
            <Button variant="secondary" onClick={() => setPhotos([])}>
              Limpiar selección
            </Button>
          </div>
        </section>
      )}
      <PagedTable
        list={list}
        keyFor={(row) => row.id}
        filters={
          <label className="field-label">
            Tipo
            <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos</option>
              <option value="image/jpeg">JPG/JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
              <option value="application/pdf">PDF</option>
            </select>
          </label>
        }
        columns={[
          {
            label: 'Archivo',
            render: (row) => (
              <>
                <p className="font-semibold">{row.fileName}</p>
                <p className="mt-1 text-xs text-muted">{row.description}</p>
              </>
            ),
          },
          {
            label: 'Fecha y categoría',
            render: (row) =>
              formatLocalDate(row.recordedOn, dateFormat) +
              ' · ' +
              row.categoryName +
              (row.tooth ? ' · Pieza ' + row.tooth : ''),
          },
          {
            label: 'Formato y tamaño',
            render: (row) =>
              row.mediaType.split('/')[1].toUpperCase() + ' · ' + fileSize(row.byteSize),
          },
        ]}
        actions={(row) => (
          <div className="flex flex-wrap gap-1">
            <Button variant="quiet" onClick={() => setView([row])}>
              Ver archivo
            </Button>
            {row.mediaType.startsWith('image/') && (
              <Button
                variant="quiet"
                aria-pressed={photos.some((photo) => photo.id === row.id)}
                onClick={() => toggle(row)}
              >
                {photos.some((photo) => photo.id === row.id)
                  ? 'Quitar de comparación'
                  : 'Elegir fotografía'}
              </Button>
            )}
          </div>
        )}
      />
      {upload && (
        <DocumentUpload
          patientId={patientId}
          timeZone={timeZone}
          onClose={() => setUpload(false)}
          onSaved={() => {
            setUpload(false)
            list.reload()
          }}
        />
      )}
      {view && (
        <DocumentViewer
          documents={view}
          dateFormat={dateFormat}
          onClose={() => setView(undefined)}
        />
      )}
    </div>
  )
}
