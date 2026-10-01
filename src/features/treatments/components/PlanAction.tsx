import { useAuth } from '../../auth/hooks/useAuth'
import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { planAction } from '../services/treatmentService'
import { money, type Plan } from '../model/treatments'
const titles: Record<string, string> = {
  propose: 'Presentar presupuesto',
  accept: 'Aceptar plan',
  finish: 'Finalizar plan',
  cancel: 'Cancelar plan',
}
export function PlanAction({
  plan,
  action,
  onClose,
  onSaved,
}: {
  plan: Plan
  action: string
  onClose: () => void
  onSaved: () => void
}) {
  const auth = useAuth(),
    form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [reason, setReason] = useState(''),
    [by, setBy] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [release, setRelease] = useState(false)
  return (
    <Modal title={titles[action]} onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              planAction(plan.id, action, {
                version: plan.version,
                requestKey: key,
                reason,
                acceptedBy: by,
                releaseUnperformed: release,
              }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {action === 'accept'
            ? 'La aceptación genera cargos por ' +
              money(plan.originalTotal, plan.currency) +
              '. Las sesiones incluidas no se cobrarán otra vez.'
            : action === 'cancel'
              ? 'La cancelación conserva las atenciones y todos los movimientos anteriores.'
              : action === 'propose'
                ? 'Presentar este presupuesto no genera deuda.'
                : 'Todas las sesiones deben estar completadas.'}
        </p>
        {action === 'accept' && (
          <>
            <FormField
              label="Nombre de quien acepta"
              required
              maxLength={160}
              value={by}
              onChange={(e) => setBy(e.target.value)}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Confirmo la aceptación explícita de importes y condiciones
            </label>
          </>
        )}
        {action === 'cancel' && plan.acceptedAt && auth.can('FINANCES_ADJUST') && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={release}
              onChange={(e) => setRelease(e.target.checked)}
            />
            Liberar el importe de sesiones pendientes; conservar lo realizado
          </label>
        )}
        <TextAreaField
          label="Motivo de la operación"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {form.error && (
          <p role="alert" className="error-box">
            {form.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy || (action === 'accept' && !confirmed)}>
            {titles[action]}
          </Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
