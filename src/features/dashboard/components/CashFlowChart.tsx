import { useState } from 'react'
import { decimalMoney } from '../../../shared/data/decimal'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import type { PeriodMoney } from '../model/dashboard'

export function CashFlowChart({ money, dateFormat }: { money: PeriodMoney; dateFormat: string }) {
  const [selected, setSelected] = useState<number>()
  const negative = money.trend.some((p) => Number(p.collections) < 0 || Number(p.expenses) < 0)
  const max = Math.max(
    1,
    ...money.trend.flatMap((p) => [Math.abs(Number(p.collections)), Math.abs(Number(p.expenses))]),
  )
  const baseline = negative ? 80 : 148
  const scale = negative ? 68 : 134
  const point = money.trend[selected ?? money.trend.length - 1]
  function geometry(value: string) {
    const amount = Number(value)
    const height = (Math.abs(amount) / max) * scale
    return { height, top: amount >= 0 ? baseline - height : baseline }
  }
  return (
    <section
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      aria-label={'Cobros y egresos - ' + money.currency}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Cobros y egresos</h3>
          <p className="mt-1 text-xs text-muted">
            {money.granularity === 'MONTH'
              ? 'Por mes'
              : money.granularity === 'WEEK'
                ? 'Por semana'
                : 'Por día'}{' '}
            · {money.currency}
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-700" />
            Cobros netos
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-600" />
            Egresos netos
          </span>
        </div>
      </div>
      {money.movements === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl bg-canvas text-sm text-muted">
          Sin movimientos registrados en este período.
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto pb-2">
            <div className="flex h-48 min-w-max items-end gap-1">
              {money.trend.map((p, index) => (
                <button
                  key={p.date}
                  type="button"
                  className={
                    'relative min-w-11 flex-1 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-brand-700 ' +
                    (selected === index ? 'bg-brand-50' : 'hover:bg-canvas')
                  }
                  onClick={() => setSelected(index)}
                  onFocus={() => setSelected(index)}
                  aria-label={
                    formatLocalDate(p.date, dateFormat) +
                    ': cobros ' +
                    decimalMoney(p.collections, money.currency) +
                    ', egresos ' +
                    decimalMoney(p.expenses, money.currency)
                  }
                >
                  <span className="relative mx-auto block h-40 w-11" aria-hidden="true">
                    <span
                      className="absolute right-0 left-0 h-px bg-line"
                      style={{ top: baseline }}
                    />
                    <span
                      className="absolute left-2 w-3 rounded-t bg-brand-700"
                      style={geometry(p.collections)}
                    />
                    <span
                      className="absolute right-2 w-3 rounded-t bg-amber-600"
                      style={geometry(p.expenses)}
                    />
                  </span>
                  <span className="mt-1 block text-center text-[10px] text-muted">
                    {p.date.slice(8)} / {p.date.slice(5, 7)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {point && (
            <p
              aria-live="polite"
              className="mt-2 rounded-xl bg-canvas px-3 py-2 text-xs text-muted"
            >
              {formatLocalDate(point.date, dateFormat)} · Cobros:{' '}
              {decimalMoney(point.collections, money.currency)} · Egresos:{' '}
              {decimalMoney(point.expenses, money.currency)}
            </p>
          )}
        </>
      )}
    </section>
  )
}
