import { useAuth } from '../../auth/hooks/useAuth'
import { getPlanItem } from '../../treatments/services/treatmentService'
import { useState } from 'react'
import { errorMessage } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { EntityPicker } from '../../../shared/ui/EntityPicker'
import type { Procedure } from '../model/clinical'
export function ProcedureEditor({
  value,
  patientId,
  dentistId,
  correcting = false,
  onChange,
}: {
  patientId: string
  dentistId: string
  correcting?: boolean
  value: Procedure[]
  onChange: (value: Procedure[]) => void
}) {
  const auth = useAuth(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false)
  function update(index: number, change: Partial<Procedure>) {
    onChange(value.map((procedure, i) => (i === index ? { ...procedure, ...change } : procedure)))
  }
  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold">Procedimientos realizados</legend>
      <p className="text-xs text-muted">
        {correcting
          ? 'La corrección clínica conserva los cargos originales; una diferencia económica requiere un ajuste explícito.'
          : 'Al finalizar, los servicios individuales generan un cargo. Las sesiones vinculadas a un plan aceptado registran avance sin otra deuda.'}
      </p>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {value.map((procedure, index) => (
        <article key={index} className="space-y-3 rounded-xl border border-line p-4">
          {auth.can('PLANS_READ') && !correcting && (
            <EntityPicker
              label={'Concepto de plan ' + (index + 1) + ' (opcional)'}
              source={{
                endpoint: '/api/v1/plans/items',
                labelKey: 'label',
                filters: { patientId, dentistId, available: 'true' },
              }}
              selected={
                procedure.planItemId
                  ? [{ id: procedure.planItemId, label: procedure.description }]
                  : []
              }
              disabled={loading}
              onChange={(items) => {
                setError('')
                if (!items[0]) {
                  update(index, { planItemId: null })
                  return
                }
                setLoading(true)
                void getPlanItem(items[0].id)
                  .then((item) =>
                    update(index, {
                      planItemId: item.id,
                      serviceId: item.serviceId,
                      description: item.description,
                      tooth: item.tooth,
                      unitPrice: null,
                    }),
                  )
                  .catch((e) => setError(errorMessage(e)))
                  .finally(() => setLoading(false))
              }}
            />
          )}
          <EntityPicker
            disabled={!!procedure.planItemId || correcting}
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
              label={(procedure.planItemId ? 'Sesiones realizadas ' : 'Cantidad ') + (index + 1)}
              type="number"
              required
              min={1}
              max={100}
              value={procedure.quantity}
              onChange={(e) => update(index, { quantity: Number(e.target.value) })}
            />
            <FormField
              disabled={!!procedure.planItemId || correcting}
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
          {!procedure.planItemId && !correcting && (
            <FormField
              label={'Precio acordado ' + (index + 1) + ' (opcional)'}
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              value={procedure.unitPrice ?? ''}
              placeholder={
                procedure.serviceId ? 'Precio vigente del catálogo' : '0.00 · Sin honorario'
              }
              onChange={(e) => update(index, { unitPrice: e.target.value || null })}
            />
          )}
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
