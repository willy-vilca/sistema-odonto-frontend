import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { PatientPicker } from '../patients/components/PatientPicker'
import { usePagedList } from '../../shared/data/usePagedList'
import { useQueryData } from '../../shared/data/useQueryData'
import { PagedTable } from '../../shared/ui/PagedTable'
import { Button } from '../../shared/ui/Button'
import { chargeKinds, type Charge, type DebtSummary } from './model/finance'
import { money } from '../treatments/model/treatments'
import { ChargeAdjustment } from './components/ChargeAdjustment'
export function DebtsPage({ timeZone }: { timeZone: string }) {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    patientId = params.get('patientId') ?? ''
  if (!auth.can('FINANCES_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar la deuda.
      </p>
    )
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Gestión · Obligaciones de pago</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Deuda por paciente</h1>
        <p className="mt-2 text-sm text-muted">
          Cargos por servicios y planes aceptados, con sus ajustes y orígenes.
        </p>
      </header>
      <p className="rounded-xl border border-line bg-brand-50 p-4 text-sm">
        Esta vista muestra deuda generada. El registro de pagos, cuotas y dinero recibido se
        incorporará en la fase de cobros.
      </p>
      <section className="rounded-2xl border border-line bg-white p-5">
        <PatientPicker
          patientId={patientId}
          onChange={(items) => setParams(items[0] ? { patientId: items[0].id } : {})}
        />
      </section>
      {patientId ? (
        <DebtWorkspace key={patientId} patientId={patientId} timeZone={timeZone} />
      ) : (
        <p className="rounded-xl border border-line p-6 text-sm text-muted">
          Selecciona un paciente para consultar sus movimientos.
        </p>
      )}
    </div>
  )
}
function DebtWorkspace({ patientId, timeZone }: { patientId: string; timeZone: string }) {
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
    [selected, setSelected] = useState<Charge>()
  function saved() {
    setSelected(undefined)
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.data?.map((s) => (
          <section key={s.currency} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">Deuda generada · {s.currency}</p>
            <p className="mt-2 text-2xl font-semibold">{money(s.netDebt, s.currency)}</p>
            <p className="mt-3 text-xs text-muted">
              Cargos: {money(s.charges, s.currency)} · Ajustes: {money(s.adjustments, s.currency)}
            </p>
          </section>
        ))}
      </div>
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
            label: 'Concepto y origen',
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
            {!c.originalId && auth.can('FINANCES_ADJUST') && (
              <Button variant="quiet" onClick={() => setSelected(c)}>
                Ajustar cargo
              </Button>
            )}
          </div>
        )}
      />
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
