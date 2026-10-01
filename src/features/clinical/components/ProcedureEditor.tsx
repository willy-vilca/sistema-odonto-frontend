import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { EntityPicker } from '../../../shared/ui/EntityPicker'
import type { Procedure } from '../model/clinical'
export function ProcedureEditor({
  value,
  onChange,
}: {
  value: Procedure[]
  onChange: (value: Procedure[]) => void
}) {
  function update(index: number, change: Partial<Procedure>) {
    onChange(value.map((procedure, i) => (i === index ? { ...procedure, ...change } : procedure)))
  }
  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold">Procedimientos realizados</legend>
      <p className="text-xs text-muted">
        Registra lo realizado en esta atención. Los cargos se incorporarán en la siguiente fase.
      </p>
      {value.map((procedure, index) => (
        <article key={index} className="space-y-3 rounded-xl border border-line p-4">
          <EntityPicker
            label={'Servicio del procedimiento ' + (index + 1) + ' (opcional)'}
            source={{ endpoint: '/api/v1/services', labelKey: 'name' }}
            selected={
              procedure.serviceId
                ? [
                    {
                      id: procedure.serviceId,
                      label: procedure.description || 'Servicio seleccionado',
                    },
                  ]
                : []
            }
            onChange={(items) =>
              update(index, {
                serviceId: items[0]?.id ?? null,
                ...(items[0] ? { description: items[0].label } : {}),
              })
            }
          />
          <FormField
            label={'Descripción del procedimiento ' + (index + 1)}
            required
            maxLength={300}
            value={procedure.description}
            onChange={(e) => update(index, { description: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label={'Cantidad ' + (index + 1)}
              type="number"
              required
              min={1}
              max={100}
              value={procedure.quantity}
              onChange={(e) => update(index, { quantity: Number(e.target.value) })}
            />
            <FormField
              label={'Pieza FDI ' + (index + 1) + ' (opcional)'}
              type="number"
              min={11}
              max={85}
              value={procedure.tooth ?? ''}
              onChange={(e) =>
                update(index, { tooth: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <Button
            type="button"
            variant="quiet"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Quitar procedimiento {index + 1}
          </Button>
        </article>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={value.length >= 50}
        onClick={() =>
          onChange([...value, { serviceId: null, description: '', quantity: 1, tooth: null }])
        }
      >
        Añadir procedimiento
      </Button>
    </fieldset>
  )
}
