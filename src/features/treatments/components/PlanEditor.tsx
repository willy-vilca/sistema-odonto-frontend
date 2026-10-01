import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { ItemEditor } from './ItemEditor'
import { emptyItem, type ItemInput, type Plan, type PlanItem } from '../model/treatments'
import { savePlan, addPlanItem } from '../services/treatmentService'
export function PlanEditor({
  patientId,
  plan,
  lines = [],
  additional = false,
  onClose,
  onSaved,
}: {
  patientId: string
  plan?: Plan
  lines?: PlanItem[]
  additional?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [title, setTitle] = useState(plan?.title ?? ''),
    [conditions, setConditions] = useState(plan?.conditions ?? ''),
    [reason, setReason] = useState(''),
    [doctor, setDoctor] = useState<PickedEntity[]>(
      plan ? [{ id: plan.dentistId, label: plan.dentistName }] : [],
    ),
    [items, setItems] = useState<ItemInput[]>(
      additional
        ? [{ ...emptyItem }]
        : lines.length
          ? lines.map((i) => ({ ...i, unitPrice: i.unitPrice.toFixed(2) }))
          : [{ ...emptyItem }],
    ),
    [error, setError] = useState('')
  return (
    <Modal
      title={
        additional ? 'Añadir concepto al plan' : plan ? 'Editar presupuesto' : 'Nuevo presupuesto'
      }
      onClose={onClose}
      busy={form.busy}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!doctor[0]) {
            setError('Selecciona el profesional responsable.')
            return
          }
          setError('')
          void form.submit(
            () =>
              additional
                ? addPlanItem(plan!.id, {
                    version: plan!.version,
                    requestKey: key,
                    reason,
                    item: items[0],
                  })
                : savePlan(plan?.id, {
                    patientId,
                    dentistId: doctor[0].id,
                    title,
                    conditions,
                    items,
                    version: plan?.version ?? 0,
                    requestKey: key,
                  }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {additional
            ? 'El adicional generará su propio cargo. Se conserva el acuerdo original.'
            : 'Un presupuesto no genera deuda hasta su aceptación explícita.'}
        </p>
        {!additional && (
          <>
            <FormField
              label="Título del presupuesto"
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <EntityPicker
              label="Profesional del plan"
              source={{
                endpoint: '/api/v1/dentists',
                labelKey: 'fullName',
                filters: { active: 'true' },
              }}
              selected={doctor}
              onChange={setDoctor}
            />
            <TextAreaField
              label="Condiciones acordadas"
              maxLength={4000}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </>
        )}
        {items.map((item, index) => (
          <div key={index} className="space-y-2">
            <ItemEditor
              item={item}
              index={index + 1}
              onChange={(value) => setItems(items.map((entry, i) => (i === index ? value : entry)))}
            />
            {!additional && items.length > 1 && (
              <Button
                type="button"
                variant="quiet"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Quitar concepto {index + 1}
              </Button>
            )}
          </div>
        ))}
        {!additional && (
          <Button
            type="button"
            variant="secondary"
            disabled={items.length >= 50}
            onClick={() => setItems([...items, { ...emptyItem }])}
          >
            Añadir concepto
          </Button>
        )}
        {additional && (
          <TextAreaField
            label="Motivo del adicional"
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        {(form.error || error) && (
          <p role="alert" className="error-box">
            {form.error || error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy}>
            {form.busy
              ? 'Guardando…'
              : additional
                ? 'Guardar adicional y cargo'
                : 'Guardar presupuesto'}
          </Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
