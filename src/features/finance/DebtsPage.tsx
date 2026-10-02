import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { usePagedList } from '../../shared/data/usePagedList'
import { useQueryData } from '../../shared/data/useQueryData'
import { PagedTable } from '../../shared/ui/PagedTable'
import { Button } from '../../shared/ui/Button'
import { chargeKinds, type Charge, type DebtSummary } from './model/finance'
import { money } from '../treatments/model/treatments'
import { ChargeFinanceForm } from './components/ChargeFinanceForm'
import { ChargeAdjustment } from './components/ChargeAdjustment'
export function DebtWorkspace({
  patientId,
  timeZone,
  today,
  onChanged,
}: {
  patientId: string
  timeZone: string
  today: string
  onChanged: () => void
}) {
  const auth = useAuth(),
    [kind, setKind] = useState(''),
    [origin, setOrigin] = useState(''),
    [currency, setCurrency] = useState(''),
    list = usePagedList<Charge>(
      '/api/v1/charges',
      { patientId, kind, currency, originalId: origin, direction: 'desc' },
      'createdAt',
    ),
    summary = useQueryData<DebtSummary[]>('/api/v1/charges/summary?patientId=' + patientId),
    [selected, setSelected] = useState<Charge>(),
    [operation, setOperation] = useState<{
      id: string
      action: 'installments' | 'discount' | 'void'
    }>()
  function saved() {
    setSelected(undefined)
    setOperation(undefined)
    onChanged()
    list.reload()
    summary.reload()
  }
  return (
    <div className="space-y-5">
      {summary.error && (
        <p role="alert" className="error-box">
          {summary.error}
        </p>
      )}
      {!summary.loading && !summary.error && !summary.data?.length && (
        <p className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
          Este paciente aún no tiene cargos registrados.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {origin ? (
          <Button variant="secondary" onClick={() => setOrigin('')}>
            Ver todos los movimientos
          </Button>
        ) : (
          <h2 className="text-xl font-semibold">Movimientos</h2>
        )}
        {auth.can('PLANS_READ') && (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
            to={'/tratamientos?patientId=' + patientId}
          >
            Ver presupuestos y planes
          </Link>
        )}
      </div>
      <PagedTable
        list={list}
        keyFor={(c) => c.id}
        filters={
          <>
            <label className="field-label">
              Tipo
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(chargeKinds).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Moneda
              <select
                className="field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="">Todas</option>
                {summary.data?.map((s) => (
                  <option key={s.currency}>{s.currency}</option>
                ))}
              </select>
            </label>
          </>
        }
        columns={[
          {
            label: 'Tratamiento y origen',
            render: (c) => (
              <>
                <p className="font-semibold">{c.description}</p>
                <p className="mt-1 text-xs text-muted">{chargeKinds[c.kind]}</p>
                {c.encounterId && auth.can('CLINICAL_READ') && (
                  <Link
                    className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-brand-700"
                    to={'/clinica?patientId=' + patientId + '&encounterId=' + c.encounterId}
                  >
                    Consultar atención clínica
                  </Link>
                )}
              </>
            ),
          },
          {
            label: 'Movimiento',
            render: (c) => (
              <>
                {money(c.amount, c.currency)}
                {c.unitPrice !== null && (
                  <p className="mt-1 text-xs text-muted">
                    {c.quantity} × {money(c.unitPrice, c.currency)}
                  </p>
                )}
              </>
            ),
          },
          {
            label: 'Motivo y responsable',
            render: (c) => (
              <>
                {c.reason}
                <p className="mt-1 text-xs text-muted">{c.actorName}</p>
              </>
            ),
          },
          {
            label: 'Fecha',
            render: (c) =>
              new Intl.DateTimeFormat('es-PE', {
                timeZone,
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(c.createdAt)),
          },
        ]}
        actions={(c) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setKind('')
                setOrigin(c.originalId ?? c.id)
              }}
            >
              Ver origen
            </Button>
            {!c.originalId && auth.can('PAYMENTS_WRITE') && (
              <Button
                variant="quiet"
                onClick={() => setOperation({ id: c.id, action: 'installments' })}
              >
                Programar cuotas
              </Button>
            )}
            {!c.originalId && auth.can('FINANCES_ADJUST') && (
              <>
                <Button
                  variant="quiet"
                  onClick={() => setOperation({ id: c.id, action: 'discount' })}
                >
                  Descuento
                </Button>
                <Button variant="quiet" onClick={() => setOperation({ id: c.id, action: 'void' })}>
                  Anular cargo
                </Button>
              </>
            )}
            {!c.originalId && auth.can('FINANCES_ADJUST') && (
              <Button variant="quiet" onClick={() => setSelected(c)}>
                Ajustar cargo
              </Button>
            )}
          </div>
        )}
      />
      {operation && (
        <ChargeFinanceForm
          chargeId={operation.id}
          action={operation.action}
          today={today}
          onClose={() => setOperation(undefined)}
          onSaved={saved}
        />
      )}
      {selected && (
        <ChargeAdjustment
          charge={selected}
          onClose={() => setSelected(undefined)}
          onSaved={saved}
        />
      )}
    </div>
  )
}
