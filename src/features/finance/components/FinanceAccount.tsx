import { notify } from '../../../shared/notifications/notifications'
import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useQueryData } from '../../../shared/data/useQueryData'
import { Button } from '../../../shared/ui/Button'
import { money } from '../../treatments/model/treatments'
import { DebtWorkspace } from '../DebtsPage'
import { PaymentForm } from './PaymentForm'
import { MovementList } from './MovementList'
import { InstallmentList } from './InstallmentList'
import { FinancialFiles } from './FinancialFiles'
import { financePost, downloadDocument } from '../services/paymentService'
import type { AccountSummary, FinancialDocument } from '../model/payments'
export function FinanceAccount({
  patientId,
  currency,
  today,
  timeZone,
  dateFormat,
}: {
  patientId: string
  currency: string
  today: string
  timeZone: string
  dateFormat: string
}) {
  const auth = useAuth(),
    summary = useQueryData<AccountSummary[]>('/api/v1/finance/summary?patientId=' + patientId),
    [tab, setTab] = useState('Cargos'),
    [form, setForm] = useState(false),
    [selectedCurrency, setCurrency] = useState(currency),
    [revision, setRevision] = useState(0),
    setError = useErrorNotification(),
    [busy, setBusy] = useState(false)
  function changed() {
    summary.reload()
    setRevision((n) => n + 1)
  }
  async function statement() {
    setBusy(true)
    setError('')
    try {
      const d = await financePost<FinancialDocument>('documents/statement', {
        requestKey: crypto.randomUUID(),
        patientId,
        currency: selectedCurrency,
      })
      await downloadDocument(d)
      notify('Estado de cuenta emitido correctamente.')
      changed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo emitir el estado.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-5">
      {summary.error && (
        <p role="alert" className="error-box">
          {summary.error}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {summary.data?.length ? (
          summary.data.map((s) => (
            <section key={s.currency} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm text-muted">Deuda generada · {s.currency}</p>
              <div className="mt-3 grid gap-4 grid-cols-2">
                <div>
                  <p className="text-xs text-muted">Saldo pendiente</p>
                  <p className="text-2xl font-semibold text-brand-700">
                    {money(s.pending, s.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Anticipo disponible</p>
                  <p className="text-xl font-semibold">{money(s.advance, s.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Dinero recibido neto</p>
                  <p className="font-semibold">{money(s.received, s.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Deuda y dinero aplicado</p>
                  <p className="text-sm">
                    {money(s.debt, s.currency)} · {money(s.applied, s.currency)}
                  </p>
                </div>
              </div>
            </section>
          ))
        ) : (
          <p className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
            Este paciente todavía no tiene movimientos financieros.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="field-label">
          Moneda de la operación
          <select
            className="field"
            value={selectedCurrency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Array.from(new Set([currency, ...(summary.data ?? []).map((s) => s.currency)])).map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          {auth.can('PAYMENTS_WRITE') && (
            <Button onClick={() => setForm(true)}>Registrar abono</Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => void statement()}>
            Estado de cuenta PDF
          </Button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de la cuenta">
        {['Cargos', 'Pagos', 'Cuotas', 'Archivos'].map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'primary' : 'secondary'}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </nav>
      <div key={revision}>
        {tab === 'Cargos' && (
          <DebtWorkspace
            patientId={patientId}
            timeZone={timeZone}
            today={today}
            onChanged={changed}
          />
        )}{' '}
        {tab === 'Pagos' && (
          <MovementList
            dateFormat={dateFormat}
            timeZone={timeZone}
            patientId={patientId}
            today={today}
            onChanged={changed}
          />
        )}{' '}
        {tab === 'Cuotas' && <InstallmentList dateFormat={dateFormat} patientId={patientId} />}{' '}
        {tab === 'Archivos' && <FinancialFiles patientId={patientId} />}
      </div>
      {form && (
        <PaymentForm
          patientId={patientId}
          currency={selectedCurrency}
          today={today}
          onClose={() => setForm(false)}
          onSaved={() => {
            setForm(false)
            setTab('Pagos')
            changed()
          }}
        />
      )}
    </section>
  )
}
