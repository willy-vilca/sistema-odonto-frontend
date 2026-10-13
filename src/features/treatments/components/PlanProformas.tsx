import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { saveJson, downloadFile } from '../../../shared/api/http'
import { planStates } from '../model/treatments'
interface Proforma {
  id: string
  planVersion: number
  planStatus: string
  code: string
  createdAt: string
  createdBy: string
  byteSize: number
}
export function PlanProformas({ planId }: { planId: string }) {
  const form = useSaveForm(),
    [history, setHistory] = useState(false)
  const list = usePagedList<Proforma>(
    history ? `/api/v1/plans/${planId}/proformas` : '',
    { direction: 'desc' },
    'createdAt',
  )
  const download = (document: Proforma) =>
    downloadFile(`/api/v1/plans/${planId}/proformas/${document.id}/content`, `${document.code}.pdf`)
  return (
    <section className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Proforma y acuerdo</h3>
          <p className="mt-1 text-xs text-muted">
            Tratamientos, sesiones y condiciones de pago. Las copias anteriores se conservan.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={form.busy}
          onClick={() =>
            void form.submit(
              async () => {
                const document = await saveJson<Proforma>(`/api/v1/plans/${planId}/proformas`, {})
                await download(document)
                return document
              },
              () => list.reload(),
            )
          }
        >
          {form.busy ? 'Preparando PDF…' : 'Descargar presupuesto PDF'}
        </Button>
      </div>
      <Button variant="quiet" onClick={() => setHistory(!history)}>
        {history ? 'Ocultar copias emitidas' : 'Ver copias emitidas'}
      </Button>
      {history && (
        <PagedTable
          list={list}
          keyFor={(d) => d.id}
          columns={[
            {
              label: 'Documento',
              render: (d) => (
                <>
                  <p className="font-medium">{d.code}</p>
                  <p className="text-xs text-muted">
                    {planStates[d.planStatus]} · Versión {d.planVersion}
                  </p>
                </>
              ),
            },
            { label: 'Emitido por', render: (d) => d.createdBy },
            {
              label: 'Acciones',
              render: (d) => (
                <Button
                  variant="quiet"
                  disabled={form.busy}
                  onClick={() =>
                    void form.submit(
                      () => download(d),
                      () => {},
                    )
                  }
                >
                  Descargar PDF
                </Button>
              ),
            },
          ]}
        />
      )}
    </section>
  )
}
