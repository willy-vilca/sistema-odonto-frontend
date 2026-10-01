import { EntityPicker } from '../../../shared/ui/EntityPicker'
import { FormField } from '../../../shared/ui/FormField'
import type { ItemInput } from '../model/treatments'
import { getServicePrice } from '../services/treatmentService'
import { useState } from 'react'
import { errorMessage } from '../../../shared/api/http'
export function ItemEditor({
  item,
  onChange,
  index,
}: {
  item: ItemInput
  onChange: (value: ItemInput) => void
  index: number
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-2 font-semibold">Concepto {index}</legend>
      <EntityPicker
        label={'Servicio ' + index + ' (opcional)'}
        source={{ endpoint: '/api/v1/services', labelKey: 'name', filters: { active: 'true' } }}
        selected={
          item.serviceId
            ? [{ id: item.serviceId, label: item.description || 'Servicio seleccionado' }]
            : []
        }
        disabled={busy}
        onChange={(selected) => {
          setError('')
          if (!selected[0]) {
            onChange({ ...item, serviceId: null })
            return
          }
          setBusy(true)
          void getServicePrice(selected[0].id)
            .then((service) =>
              onChange({
                ...item,
                serviceId: selected[0].id,
                description: service.name,
                unitPrice: service.price.toFixed(2),
              }),
            )
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false))
        }}
      />
      <FormField
        label={'Descripción del concepto ' + index}
        required
        maxLength={300}
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label={'Precio unitario ' + index}
          required
          type="number"
          min="0"
          max="99999999.99"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onChange({ ...item, unitPrice: e.target.value })}
        />
        <FormField
          label={'Unidades facturadas ' + index}
          required
          type="number"
          min={1}
          max={100}
          value={item.quantity}
          onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })}
        />
        <FormField
          label={'Sesiones previstas ' + index}
          required
          type="number"
          min={1}
          max={100}
          value={item.sessions}
          onChange={(e) => onChange({ ...item, sessions: Number(e.target.value) })}
        />
        <FormField
          label={'Pieza del concepto ' + index + ' (opcional)'}
          type="number"
          min={11}
          max={85}
          value={item.tooth ?? ''}
          onChange={(e) =>
            onChange({ ...item, tooth: e.target.value ? Number(e.target.value) : null })
          }
        />
      </div>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">
        Las unidades definen el importe; las sesiones definen el avance clínico.
      </p>
    </fieldset>
  )
}
