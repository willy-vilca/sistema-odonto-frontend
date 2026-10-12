import { chargePaymentStates, type Charge } from '../model/finance'
import { money } from '../../treatments/model/treatments'

export function ChargePaymentSummary({ charge }: { charge: Charge }) {
  if (charge.originalId) {
    return (
      <div>
        <p className="font-semibold">{money(charge.amount, charge.currency)}</p>
        <p className="mt-1 text-xs text-muted">Movimiento de ajuste del cargo original</p>
      </div>
    )
  }
  return (
    <div className="min-w-44 space-y-3">
      {charge.paymentStatus && (
        <span
          className={
            charge.paymentStatus === 'PAID' || charge.paymentStatus === 'NO_BALANCE'
              ? 'status-active'
              : 'status-inactive'
          }
        >
          {chargePaymentStates[charge.paymentStatus]}
        </span>
      )}
      <dl className="space-y-1 text-sm">
        {[
          ['Total del cargo', charge.debt],
          ['Pagado', charge.applied],
          ['Falta pagar', charge.pending],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
          >
            <dt className="text-muted">{label}</dt>
            <dd className={'whitespace-nowrap ' + (label === 'Falta pagar' ? 'font-semibold' : '')}>
              {typeof value === 'number' ? money(value, charge.currency) : '—'}
            </dd>
          </div>
        ))}
      </dl>
      {charge.unitPrice !== null && (
        <p className="text-xs text-muted">
          {charge.quantity} × {money(charge.unitPrice, charge.currency)}
        </p>
      )}
      {charge.debt !== null && charge.amount !== charge.debt && (
        <p className="text-xs text-muted">
          Importe inicial: {money(charge.amount, charge.currency)}
        </p>
      )}
    </div>
  )
}
