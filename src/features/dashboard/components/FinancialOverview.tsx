import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, WalletCards } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { decimalMoney } from '../../../shared/data/decimal'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { ReportTotals } from '../../reports/components/ReportTotals'
import type { Dashboard } from '../model/dashboard'
import { MetricCard } from './MetricCard'
import { CashFlowChart } from './CashFlowChart'

export function FinancialOverview({ data, dateFormat }: { data: Dashboard; dateFormat: string }) {
  const auth = useAuth()
  if (!data.money) return null
  return (
    <section className="space-y-5" aria-labelledby="financial-overview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="financial-overview" className="text-xl font-semibold">
            Movimiento financiero
          </h2>
          <p className="mt-1 text-sm text-muted">
            {formatLocalDate(data.from, dateFormat)} al {formatLocalDate(data.to, dateFormat)} ·
            Todo el consultorio
          </p>
        </div>
        {auth.can('REPORTS_READ') && (
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-brand-700"
            to={`/reportes?type=COLLECTIONS&from=${data.from}&to=${data.to}`}
          >
            Consultar reportes <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {data.money.map((money) => (
        <div key={money.currency} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              label={'Cobros netos · ' + money.currency}
              value={decimalMoney(money.collections, money.currency)}
              detail={`Recibido: ${decimalMoney(money.received, money.currency)} · Devuelto/revertido: ${decimalMoney(money.returned, money.currency)}`}
              icon={ArrowDownLeft}
            />
            <MetricCard
              label={'Egresos netos · ' + money.currency}
              value={decimalMoney(money.expenses, money.currency)}
              detail="Gastos del período menos sus reversiones."
              icon={ArrowUpRight}
              tone="amber"
            />
            <MetricCard
              label={'Flujo neto de caja · ' + money.currency}
              value={decimalMoney(money.net, money.currency)}
              detail="Cobros menos egresos, para todos los medios de pago."
              icon={WalletCards}
            />
          </div>
          <CashFlowChart
            key={money.currency + data.from + data.to}
            money={money}
            dateFormat={dateFormat}
          />
        </div>
      ))}
      {data.balances && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            Cuentas al {formatLocalDate(data.to, dateFormat)}
          </h3>
          <ReportTotals
            metrics={data.balances.filter((metric) => ['pending', 'advance'].includes(metric.key))}
          />
          <p className="text-xs text-muted">
            Deuda acumulada y dinero pendiente de aplicar, incluyendo movimientos anteriores al
            período.
          </p>
        </div>
      )}
    </section>
  )
}
