import type { PickedEntity } from '../../../shared/ui/EntityPicker'
import type { Allocation } from './payments'

export function moneyCents(value: string | number): number {
  const text = String(value).trim()
  if (!/^\d+(\.\d{0,2})?$/.test(text)) return 0
  const [units, decimals = ''] = text.split('.')
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : 0
}

export function suggestAllocations(
  items: PickedEntity[],
  rows: Allocation[],
  manual: ReadonlySet<string>,
  budget: string | number,
): Allocation[] {
  let remaining = Math.max(
    0,
    moneyCents(budget) -
      rows.reduce(
        (total, row) =>
          total +
          (manual.has(row.chargeId) && items.some((item) => item.id === row.chargeId)
            ? moneyCents(row.amount)
            : 0),
        0,
      ),
  )
  return items.map((item) => {
    const row = rows.find((entry) => entry.chargeId === item.id)
    if (manual.has(item.id)) return row ?? { chargeId: item.id, amount: '' }
    const amount = Math.min(remaining, moneyCents(String(item.data?.pending ?? 0)))
    remaining -= amount
    return { chargeId: item.id, amount: amount > 0 ? (amount / 100).toFixed(2) : '' }
  })
}
