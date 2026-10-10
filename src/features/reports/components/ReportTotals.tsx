import { decimalMoney } from '../../../shared/data/decimal'
import type { ReportMetric } from '../model/reports'
export function ReportTotals({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <section
      aria-label="Totales del resultado filtrado"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <article
          key={`${metric.key}-${metric.currency}-${index}`}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5"
        >
          <p className="text-xs font-medium text-muted">
            {metric.label}
            {metric.currency && <span className="ml-1">· {metric.currency}</span>}
          </p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-brand-800">
            {metric.currency ? decimalMoney(metric.value, metric.currency) : metric.value}
          </p>
        </article>
      ))}
    </section>
  )
}
