import { useState } from 'react'
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
}: {
  patientId: string
  currency: string
  rows: Allocation[]
  onChange: (rows: Allocation[]) => void
  label?: string
}) {
  const [selected, setSelected] = useState<PickedEntity[]>([])
  function choose(items: PickedEntity[]) {
    setSelected(items)
    onChange(
      items.map(
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
          filters: { patientId, currency },
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
            onChange={(e) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))
            }
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
        Selecciona cargos de este paciente en la misma moneda. Respeta el anticipo disponible y el
        saldo pendiente de cada cargo.
      </p>
    </fieldset>
  )
}
