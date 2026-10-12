import { useEffect, useRef, useState } from 'react'
import { suggestAllocations } from '../model/allocationSuggestion'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { FormField } from '../../../shared/ui/FormField'
import { Button } from '../../../shared/ui/Button'
import type { Allocation } from '../model/payments'
export function AllocationEditor({
  patientId,
  currency,
  rows,
  onChange,
  label = 'Aplicación a cargos',
  pendingOnly = true,
  initialSelected = [],
  budget,
}: {
  patientId: string
  currency: string
  rows: Allocation[]
  onChange: (rows: Allocation[]) => void
  label?: string
  pendingOnly?: boolean
  initialSelected?: PickedEntity[]
  budget?: string | number
}) {
  const [selected, setSelected] = useState<PickedEntity[]>(initialSelected)
  const manual = useRef(new Set<string>())
  useEffect(() => {
    if (budget === undefined) return
    const suggested = suggestAllocations(selected, rows, manual.current, budget)
    if (suggested.some((row, index) => row.amount !== rows[index]?.amount)) onChange(suggested)
  }, [budget, selected, rows, onChange])
  function choose(items: PickedEntity[]) {
    setSelected(items)
    for (const id of manual.current)
      if (!items.some((item) => item.id === id)) manual.current.delete(id)
    onChange(
      budget !== undefined
        ? suggestAllocations(items, rows, manual.current, budget)
        : items.map(
            (item) => rows.find((r) => r.chargeId === item.id) ?? { chargeId: item.id, amount: '' },
          ),
    )
  }
  return (
    <fieldset className="space-y-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <EntityPicker
        label="cargos"
        multiple
        source={{
          endpoint: '/api/v1/finance/charges',
          labelKey: 'description',
          filters: { patientId, currency, closed: 'false', pendingOnly: String(pendingOnly) },
        }}
        selected={selected}
        onChange={choose}
      />
      {rows.map((row, i) => (
        <div key={row.chargeId} className="flex items-end gap-3">
          <FormField
            label={'Importe aplicado ' + (i + 1)}
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            required
            value={row.amount}
            onChange={(e) => {
              manual.current.add(row.chargeId)
              onChange(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))
            }}
          />
          <Button
            type="button"
            variant="quiet"
            onClick={() => choose(selected.filter((s) => s.id !== row.chargeId))}
          >
            Quitar
          </Button>
        </div>
      ))}
      <p className="text-xs text-muted">
        {budget !== undefined
          ? 'El importe se propone automáticamente, sin exceder el abono ni el saldo del cargo. Puedes modificarlo; lo no aplicado queda como anticipo.'
          : 'Selecciona cargos de este paciente en la misma moneda.'}
      </p>
    </fieldset>
  )
}
