import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { usePdfPage } from '../hooks/usePdfPage'
export function PdfViewer({ id, fileName }: { id: string; fileName: string }) {
  const [page, setPage] = useState(0),
    result = usePdfPage(id, page),
    loading = result.loading
  return (
    <section className="space-y-3" aria-label={'PDF: ' + fileName}>
      {loading ? (
        <p role="status" className="rounded-xl bg-canvas p-5 text-sm">
          Cargando página del PDF…
        </p>
      ) : result.error ? (
        <p role="alert" className="error-box">
          {result.error}
        </p>
      ) : (
        <img
          src={result.url}
          alt={'Página ' + (page + 1) + ' de ' + result.pages + ' del PDF ' + fileName}
          className="max-h-[60dvh] w-full rounded-xl border border-line bg-white object-contain"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || page === 0}
          onClick={() => setPage(page - 1)}
        >
          Página anterior
        </Button>
        <span role="status" className="text-xs text-muted">
          Página {page + 1} de {result.pages}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || page + 1 >= result.pages}
          onClick={() => setPage(page + 1)}
        >
          Página siguiente
        </Button>
      </div>
    </section>
  )
}
