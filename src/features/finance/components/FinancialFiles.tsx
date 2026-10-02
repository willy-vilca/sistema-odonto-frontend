import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { useState, useEffect } from 'react'
import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { FormField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { requestBlob } from '../../../shared/api/http'
import { downloadDocument, uploadSupport } from '../services/paymentService'
import type { FinancialDocument } from '../model/payments'
export function FinancialFiles({
  patientId,
  movementId,
  canUpload = false,
}: {
  patientId?: string
  movementId?: string
  canUpload?: boolean
}) {
  const list = usePagedList<FinancialDocument>(
      '/api/v1/finance/documents',
      { patientId: patientId ?? '', movementId: movementId ?? '', direction: 'desc' },
      'createdAt',
    ),
    [upload, setUpload] = useState(false),
    [preview, setPreview] = useState<FinancialDocument>(),
    setError = useErrorNotification()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="text-lg font-semibold">Constancias y sustentos</h3>
        {movementId && canUpload && (
          <Button onClick={() => setUpload(true)}>Adjuntar sustento</Button>
        )}
      </div>
      <PagedTable
        list={list}
        keyFor={(d) => d.id}
        columns={[
          {
            label: 'Documento',
            render: (d) => (
              <>
                <p className="font-semibold">{d.description}</p>
                <p className="text-xs text-muted">{d.fileName}</p>
              </>
            ),
          },
          {
            label: 'Detalle',
            render: (d) => (
              <>
                {d.generated ? 'Constancia interna' : 'Sustento adjunto'} ·{' '}
                {(d.byteSize / 1024).toFixed(1)} KiB
                <p className="text-xs text-muted">{d.actorName}</p>
              </>
            ),
          },
        ]}
        actions={(d) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPreview(d)}>
              Visualizar
            </Button>
            <Button
              variant="quiet"
              onClick={() => void downloadDocument(d).catch((e) => setError(String(e.message)))}
            >
              Descargar
            </Button>
          </div>
        )}
      />
      {upload && movementId && (
        <SupportForm
          movementId={movementId}
          onClose={() => setUpload(false)}
          onSaved={() => {
            setUpload(false)
            list.reload()
          }}
        />
      )}
      {preview && <FilePreview document={preview} onClose={() => setPreview(undefined)} />}
    </div>
  )
}
function SupportForm({
  movementId,
  onClose,
  onSaved,
}: {
  movementId: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [file, setFile] = useState<File>(),
    [description, setDescription] = useState('')
  return (
    <Modal title="Adjuntar sustento" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (file) void form.submit(() => uploadSupport(movementId, description, file), onSaved)
        }}
      >
        <FormField
          label="Descripción del sustento"
          required
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="field-label">
          Imagen o PDF
          <input
            className="field"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-muted">
          Se conserva el archivo original. Se aplica el límite configurado para archivos,
          inicialmente 20 MiB.
        </p>
        <Button disabled={form.busy}>Guardar sustento</Button>
      </form>
    </Modal>
  )
}
function FilePreview({ document, onClose }: { document: FinancialDocument; onClose: () => void }) {
  const [page, setPage] = useState(0),
    [data, setData] = useState<{ url: string; pages: number }>(),
    [error, setError] = useState(''),
    [zoom, setZoom] = useState(100)
  useEffect(() => {
    const control = new AbortController()
    let url: string | undefined
    requestBlob(
      '/api/v1/finance/documents/' +
        document.id +
        (document.mediaType === 'application/pdf' ? '/preview?page=' + page : '/content'),
      control.signal,
    )
      .then(({ blob, pages }) => {
        url = URL.createObjectURL(blob)
        setData({ url, pages })
      })
      .catch((e) => {
        if (!control.signal.aborted) setError(String(e.message))
      })
    return () => {
      control.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [document, page])
  return (
    <Modal title="Visualizar documento financiero" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm">{document.description}</p>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setZoom((n) => Math.max(100, n - 50))}
            disabled={zoom === 100}
          >
            Reducir
          </Button>
          <span className="text-sm" aria-live="polite">
            Zoom {zoom}%
          </span>
          <Button
            variant="secondary"
            onClick={() => setZoom((n) => Math.min(400, n + 50))}
            disabled={zoom === 400}
          >
            Ampliar
          </Button>
        </div>
        <div
          className="max-h-[65vh] overflow-auto rounded-lg border border-line"
          tabIndex={0}
          role="region"
          aria-label="Vista del documento ampliable"
        >
          {data ? (
            <img
              src={data.url}
              alt={document.description}
              className="mx-auto h-auto max-w-none"
              style={{ width: zoom + '%' }}
            />
          ) : (
            <p role="status">Cargando documento…</p>
          )}
        </div>
        {document.mediaType === 'application/pdf' && data && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>
              Página anterior
            </Button>
            <span className="text-sm">
              Página {page + 1} de {data.pages}
            </span>
            <Button
              variant="secondary"
              disabled={page + 1 >= data.pages}
              onClick={() => setPage((n) => n + 1)}
            >
              Página siguiente
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
