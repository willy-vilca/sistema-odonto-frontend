import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useQueryData } from '../../../shared/data/useQueryData'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { money } from '../../treatments/model/treatments'
import { financePost, downloadCash } from '../services/paymentService'
import type { Cash } from '../model/payments'
import { MovementList } from './MovementList'
export function CashPanel({
  currency,
  today,
  timeZone,
  dateFormat,
}: {
  currency: string
  today: string
  timeZone: string
  dateFormat: string
}) {
  const auth = useAuth(),
    current = useQueryData<Cash | null>('/api/v1/finance/cash/current'),
    [closed, setClosed] = useState(''),
    [editor, setEditor] = useState<Cash | null | undefined>(undefined),
    [selected, setSelected] = useState<Cash>(),
    [downloadError, setDownloadError] = useState(''),
    list = usePagedList<Cash>('/api/v1/finance/cash', { closed, direction: 'desc' }, 'createdAt')
  function changed() {
    current.reload()
    list.reload()
  }
  return (
    <section className="space-y-5">
      {downloadError && (
        <p role="alert" className="error-box">
          {downloadError}
        </p>
      )}
      {current.error && (
        <p role="alert" className="error-box">
          {current.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Caja del consultorio</h2>
        {auth.can('CASH_WRITE') && !current.loading && !current.error && (
          <Button onClick={() => setEditor(current.data ?? null)}>
            {current.data ? 'Cerrar caja' : 'Abrir caja'}
          </Button>
        )}
      </div>
      {current.data ? (
        <CashSummary cash={current.data} />
      ) : (
        <p className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
          {current.loading
            ? 'Consultando caja…'
            : 'No hay caja abierta. Abre una para registrar operaciones en efectivo.'}
        </p>
      )}
      <PagedTable
        list={list}
        keyFor={(c) => c.id}
        filters={
          <label className="field-label">
            Estado
            <select className="field" value={closed} onChange={(e) => setClosed(e.target.value)}>
              <option value="">Todas</option>
              <option value="false">Abiertas</option>
              <option value="true">Cerradas</option>
            </select>
          </label>
        }
        columns={[
          {
            label: 'Apertura y responsable',
            render: (c) => (
              <>
                {new Intl.DateTimeFormat('es-PE', {
                  timeZone,
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(c.openedAt))}
                <p className="text-xs text-muted">{c.openedBy}</p>
              </>
            ),
          },
          { label: 'Saldo esperado', render: (c) => money(c.expected, c.currency) },
          {
            label: 'Arqueo',
            render: (c) => (
              <>
                {c.closedAt ? 'Cerrada' : 'Abierta'}
                {c.counted !== null && (
                  <p className="text-xs">
                    Contado {money(c.counted, c.currency)} · Diferencia{' '}
                    {money(c.difference ?? 0, c.currency)}
                  </p>
                )}
              </>
            ),
          },
        ]}
        actions={(c) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSelected(c)}>
              Ver caja
            </Button>
            {c.closedAt && (
              <Button
                variant="quiet"
                onClick={() =>
                  void downloadCash(c.id).catch((e) => setDownloadError(String(e.message)))
                }
              >
                Arqueo PDF
              </Button>
            )}
          </div>
        )}
      />
      {editor !== undefined && (
        <CashForm
          cash={editor}
          currency={currency}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined)
            changed()
          }}
        />
      )}
      {selected && (
        <Modal title="Detalle de caja" onClose={() => setSelected(undefined)}>
          <div className="space-y-5">
            <CashSummary cash={selected} />
            <p className="text-sm">{selected.reason}</p>
            <MovementList
              dateFormat={dateFormat}
              timeZone={timeZone}
              cashSessionId={selected.id}
              today={today}
              onChanged={changed}
            />
          </div>
        </Modal>
      )}
    </section>
  )
}
function CashSummary({ cash }: { cash: Cash }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted">Efectivo esperado</p>
        <p className="mt-2 text-2xl font-semibold text-brand-700">
          {money(cash.expected, cash.currency)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted">Fondo inicial</p>
        <p className="mt-2 text-xl font-semibold">{money(cash.opening, cash.currency)}</p>
      </div>
      <div>
        <p className="text-xs text-muted">Movimientos de otros medios</p>
        <p className="mt-2 text-xl font-semibold">{money(cash.nonCashNet, cash.currency)}</p>
        <p className="text-xs text-muted">Se muestran aparte del efectivo.</p>
      </div>
      {cash.closedAt && (
        <p className="col-span-full text-sm">
          Cierre: {cash.closedBy} · Contado {money(cash.counted ?? 0, cash.currency)} · Diferencia{' '}
          {money(cash.difference ?? 0, cash.currency)}
        </p>
      )}
    </div>
  )
}
function CashForm({
  cash,
  currency,
  onClose,
  onSaved,
}: {
  cash: Cash | null
  currency: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [amount, setAmount] = useState(cash ? String(cash.expected) : '0'),
    [reason, setReason] = useState('')
  return (
    <Modal title={cash ? 'Cerrar caja' : 'Abrir caja'} onClose={onClose} busy={form.busy}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              financePost(
                cash ? 'cash/' + cash.id + '/close' : 'cash',
                cash
                  ? { requestKey: key, counted: amount, reason }
                  : { requestKey: key, currency, opening: amount, reason },
              ),
            onSaved,
          )
        }}
      >
        {cash && (
          <p className="rounded-xl bg-brand-50 p-4 text-sm">
            Efectivo esperado {money(cash.expected, cash.currency)}. El cierre conserva el saldo
            esperado, el contado y su diferencia.
          </p>
        )}
        <FormField
          label={cash ? 'Efectivo contado' : 'Fondo inicial de efectivo'}
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextAreaField
          label="Motivo y observaciones de caja"
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
        <Button disabled={form.busy}>Confirmar {cash ? 'cierre' : 'apertura'}</Button>
      </form>
    </Modal>
  )
}
