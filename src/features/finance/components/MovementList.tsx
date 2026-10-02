import { formatLocalDate } from '../../../shared/data/dateFormat'
import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { money } from '../../treatments/model/treatments'
import { methods, movementKinds, type Movement, type Application } from '../model/payments'
import { PaymentOperation } from './PaymentOperation'
import { FinancialFiles } from './FinancialFiles'
import { downloadDocument, receipt } from '../services/paymentService'
export function MovementList({
  patientId,
  dateFormat = 'DMY',
  timeZone = 'America/Lima',
  expense = false,
  cashSessionId,
  today,
  onChanged,
}: {
  patientId?: string
  dateFormat?: string
  timeZone?: string
  expense?: boolean
  cashSessionId?: string
  today: string
  onChanged: () => void
}) {
  const auth = useAuth(),
    [kind, setKind] = useState(expense ? 'EXPENSE' : ''),
    [method, setMethod] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [selected, setSelected] = useState<Movement>(),
    [operation, setOperation] = useState<{ movement: Movement; action: string }>(),
    [error, setError] = useState(''),
    list = usePagedList<Movement>(
      '/api/v1/finance/movements',
      {
        patientId: patientId ?? '',
        cashSessionId: cashSessionId ?? '',
        kind,
        method,
        from,
        to,
        direction: 'desc',
      },
      'createdAt',
    )
  function saved() {
    setOperation(undefined)
    setSelected(undefined)
    list.reload()
    onChanged()
  }
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <PagedTable
        list={list}
        keyFor={(m) => m.id}
        filters={
          <>
            <label className="field-label">
              Movimiento
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                {!expense && <option value="">Todos</option>}
                {Object.entries(movementKinds)
                  .filter(([k]) =>
                    cashSessionId
                      ? true
                      : expense
                        ? k.startsWith('EXPENSE')
                        : !k.startsWith('EXPENSE'),
                  )
                  .map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field-label">
              Medio
              <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(methods).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Desde
              <input
                className="field"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field-label">
              Hasta
              <input
                className="field"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        }
        columns={[
          {
            label: 'Concepto',
            render: (m) => (
              <>
                <p className="font-semibold">{m.description}</p>
                <p className="text-xs text-muted">
                  {movementKinds[m.kind]} · {m.receiptCode ?? m.categoryName}
                </p>
                {m.supplier && <p className="text-xs">{m.supplier}</p>}
              </>
            ),
          },
          {
            label: 'Importe y aplicación',
            render: (m) => (
              <>
                {money(m.amount, m.currency)}
                {m.kind === 'PAYMENT' && (
                  <p className="mt-1 text-xs text-muted">
                    Aplicado {money(m.applied, m.currency)} · Disponible{' '}
                    {money(m.available, m.currency)}
                  </p>
                )}
                {m.originalId === null && m.effectiveAmount !== m.amount && (
                  <p className="text-xs text-muted">
                    Vigente {money(m.effectiveAmount, m.currency)}
                  </p>
                )}
              </>
            ),
          },
          {
            label: 'Fecha y medio',
            render: (m) => (
              <>
                {formatLocalDate(m.occurredOn, dateFormat)}
                <p className="text-xs">
                  {methods[m.method]} · {m.reference || 'Sin referencia'}
                </p>
                <p className="text-xs text-muted">{m.actorName}</p>
              </>
            ),
          },
        ]}
        actions={(m) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSelected(m)}>
              Ver movimiento
            </Button>
            {m.receiptCode && (
              <Button
                variant="quiet"
                onClick={() =>
                  void receipt(m)
                    .then(downloadDocument)
                    .catch((e) => setError(String(e.message)))
                }
              >
                Constancia PDF
              </Button>
            )}
            {m.kind === 'PAYMENT' && m.available > 0 && auth.can('PAYMENTS_WRITE') && (
              <Button
                variant="quiet"
                onClick={() => setOperation({ movement: m, action: 'apply' })}
              >
                Aplicar anticipo
              </Button>
            )}
          </div>
        )}
      />
      {selected && (
        <Modal title="Detalle del movimiento" onClose={() => setSelected(undefined)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-brand-50 p-4 text-sm">
              <p className="font-semibold">
                {movementKinds[selected.kind]} · {money(selected.amount, selected.currency)}
              </p>
              <p>{selected.description}</p>
              <p>
                {selected.actorName} · {formatLocalDate(selected.occurredOn, dateFormat)} ·{' '}
                {methods[selected.method]}
              </p>
              {selected.originalId && (
                <p className="mt-2 break-all text-xs">Referencia original: {selected.originalId}</p>
              )}
            </div>
            {selected.kind === 'PAYMENT' && (
              <Applications
                timeZone={timeZone}
                paymentId={selected.id}
                currency={selected.currency}
              />
            )}
            <FinancialFiles
              movementId={selected.id}
              canUpload={auth.can(selected.patientId ? 'PAYMENTS_WRITE' : 'EXPENSES_WRITE')}
            />
            {auth.can('FINANCES_ADJUST') &&
              selected.effectiveAmount > 0 &&
              ['PAYMENT', 'EXPENSE'].includes(selected.kind) && (
                <div className="flex flex-wrap gap-2">
                  {selected.kind === 'PAYMENT' ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOperation({ movement: selected, action: 'release' })
                          setSelected(undefined)
                        }}
                      >
                        Liberar aplicación
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOperation({ movement: selected, action: 'refund' })
                          setSelected(undefined)
                        }}
                      >
                        Devolver dinero
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setOperation({ movement: selected, action: 'reverse' })
                          setSelected(undefined)
                        }}
                      >
                        Revertir pago
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="quiet"
                      onClick={() => {
                        setOperation({ movement: selected, action: 'expenseReverse' })
                        setSelected(undefined)
                      }}
                    >
                      Revertir egreso
                    </Button>
                  )}
                </div>
              )}
          </div>
        </Modal>
      )}
      {operation && (
        <PaymentOperation
          {...operation}
          today={today}
          onClose={() => setOperation(undefined)}
          onSaved={saved}
        />
      )}
    </div>
  )
}
function Applications({
  paymentId,
  currency,
  timeZone,
}: {
  paymentId: string
  currency: string
  timeZone: string
}) {
  const list = usePagedList<Application>(
    '/api/v1/finance/applications',
    { paymentId, direction: 'desc' },
    'createdAt',
  )
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">Historial de aplicaciones</h3>
      <PagedTable
        list={list}
        keyFor={(a) => a.id}
        columns={[
          {
            label: 'Cargo',
            render: (a) => (
              <>
                {a.description}
                <p className="text-xs text-muted">{a.reason}</p>
              </>
            ),
          },
          {
            label: 'Aplicación o liberación',
            render: (a) => (
              <>
                {money(a.amount, currency)}
                <p className="text-xs text-muted">
                  {new Intl.DateTimeFormat('es-PE', {
                    timeZone,
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(a.createdAt))}
                </p>
              </>
            ),
          },
        ]}
      />
    </div>
  )
}
