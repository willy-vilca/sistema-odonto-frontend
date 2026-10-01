import { PdfViewer } from './PdfViewer'
import { Modal } from '../../../shared/ui/Modal'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { contentUrl } from '../services/documentService'
import type { PatientDocument } from '../model/documents'
export function DocumentViewer({
  documents,
  dateFormat,
  onClose,
}: {
  documents: PatientDocument[]
  dateFormat: string
  onClose: () => void
}) {
  return (
    <Modal
      title={documents.length === 2 ? 'Comparar fotografías' : 'Documento del paciente'}
      onClose={onClose}
    >
      <div className={'grid gap-5 ' + (documents.length === 2 ? 'sm:grid-cols-2' : '')}>
        {documents.map((document) => (
          <article key={document.id} className="min-w-0 space-y-3">
            <h3 className="break-words font-semibold">{document.fileName}</h3>
            <p className="text-xs text-muted">
              {formatLocalDate(document.recordedOn, dateFormat)} · {document.categoryName}
            </p>
            {document.mediaType === 'application/pdf' ? (
              <PdfViewer id={document.id} fileName={document.fileName} />
            ) : (
              <img
                src={contentUrl(document.id)}
                alt={document.description || document.fileName}
                className="max-h-[60dvh] w-full rounded-xl border border-line bg-canvas object-contain"
              />
            )}
            <p className="text-sm break-words whitespace-pre-wrap">{document.description}</p>
            <a
              href={contentUrl(document.id, true)}
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-brand-700"
            >
              Descargar original
            </a>
          </article>
        ))}
      </div>
    </Modal>
  )
}
