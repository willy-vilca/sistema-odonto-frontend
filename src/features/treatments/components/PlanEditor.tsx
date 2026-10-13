import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { useState } from 'react'
import { useSoleDentist } from '../../configuration/hooks/useSoleDentist'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { ItemEditor } from './ItemEditor'
import { PaymentAgreementEditor } from './PaymentAgreementEditor'
import type { AgreementInput } from '../model/treatments'
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
    [pendingServices, setPendingServices] = useState<Record<number, boolean>>({}),
    [key] = useState(() => crypto.randomUUID()),
    [title, setTitle] = useState(plan?.title ?? ''),
    [conditions, setConditions] = useState(plan?.conditions ?? ''),
    [agreement, setAgreement] = useState<AgreementInput>({
      initialAmount: (plan?.paymentAgreement?.initialAmount ?? 0).toFixed(2),
      installments: (plan?.paymentAgreement?.installments ?? []).map((d) => ({
        dueOn: d.dueOn,
        amount: d.amount.toFixed(2),
      })),
    }),
    [reason, setReason] = useState(''),
    [chosenDoctor, setDoctor] = useState<PickedEntity[]>(
      plan ? [{ id: plan.dentistId, label: plan.dentistName }] : [],
    ),
    [items, setItems] = useState<ItemInput[]>(
      additional
        ? [{ ...emptyItem }]
        : lines.length
          ? lines.map((i) => ({ ...i, unitPrice: i.unitPrice.toFixed(2) }))
          : [{ ...emptyItem }],
    ),
    setError = useErrorNotification()
  const sole = useSoleDentist()
  const doctor = chosenDoctor.length ? chosenDoctor : sole.selection
  const busy = form.busy || Object.values(pendingServices).some(Boolean)
  return (
    <Modal
      title={
        additional
          ? 'Añadir tratamiento al plan'
          : plan
            ? 'Editar presupuesto'
            : 'Nuevo presupuesto'
      }
      onClose={onClose}
      busy={busy}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (busy) return
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
                    paymentAgreement: agreement,
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
            {sole.loading ? (
              <p role="status" className="text-sm text-muted">
                Cargando profesional…
              </p>
            ) : sole.selection.length === 1 && doctor[0]?.id === sole.selection[0].id ? (
              <p className="rounded-xl bg-brand-50 p-3 text-sm">Profesional: {doctor[0].label}</p>
            ) : (
              <EntityPicker
                label="Profesional del plan"
                required
                source={{
                  endpoint: '/api/v1/dentists',
                  labelKey: 'fullName',
                  filters: { active: 'true' },
                }}
                selected={doctor}
                onChange={setDoctor}
              />
            )}
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
              onChange={(change) =>
                setItems((current) =>
                  current.map((entry, i) => (i === index ? { ...entry, ...change } : entry)),
                )
              }
              onLoadingChange={(loading) =>
                setPendingServices((current) => ({ ...current, [index]: loading }))
              }
            />
            {!additional && items.length > 1 && (
              <Button
                type="button"
                variant="quiet"
                disabled={busy}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Quitar tratamiento {index + 1}
              </Button>
            )}
          </div>
        ))}
        {!additional && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || items.length >= 50}
            onClick={() => setItems([...items, { ...emptyItem }])}
          >
            Añadir tratamiento
          </Button>
        )}
        {!additional && (
          <PaymentAgreementEditor
            value={agreement}
            totalCents={items.reduce(
              (sum, i) => sum + Math.round(Number(i.unitPrice || 0) * 100) * i.quantity,
              0,
            )}
            onChange={setAgreement}
          />
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
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy}>
            {form.busy
              ? 'Guardando…'
              : additional
                ? 'Guardar adicional y cargo'
                : 'Guardar presupuesto'}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
