import { FieldLabel } from '../../../shared/ui/FieldLabel'
import { useAuth } from '../../auth/hooks/useAuth'
import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { planAction } from '../services/treatmentService'
import { money, type Plan } from '../model/treatments'
import { useQueryData } from '../../../shared/data/useQueryData'
import { clinicToday } from '../../../shared/data/dateFormat'
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
    [release, setRelease] = useState(false),
    [initialReceived, setInitialReceived] = useState(false),
    [paymentDate, setPaymentDate] = useState(''),
    [method, setMethod] = useState('CASH'),
    [reference, setReference] = useState('')
  const installation = useQueryData<{ timeZone: string }>('/api/v1/system/installation')
  const initial = plan.paymentAgreement?.initialAmount ?? 0
  const occurredOn =
    paymentDate || (installation.data ? clinicToday(installation.data.timeZone) : '')
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
                initialCollection:
                  action === 'accept' && initial > 0
                    ? { received: initialReceived, occurredOn, method, reference }
                    : null,
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
              ? 'Se cancelarán las sesiones pendientes y las citas futuras del plan. Se conservan las atenciones y todos los movimientos anteriores.'
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
                aria-label={'Confirmo la aceptación explícita de importes y condiciones'}
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <FieldLabel
                label={'Confirmo la aceptación explícita de importes y condiciones'}
                required={true}
              />
            </label>
          </>
        )}
        {action === 'accept' && initial > 0 && (
          <fieldset className="space-y-3 rounded-xl border border-line p-4">
            <legend className="px-2 font-semibold">Cobrar pago inicial acordado</legend>
            <p className="text-sm">
              Se registrará un abono de <strong>{money(initial, plan.currency)}</strong> y se
              aplicará al tratamiento al confirmar.
            </p>
            <FormField
              label="Fecha del pago inicial"
              required
              type="date"
              value={occurredOn}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <label className="field-label">
              Medio del pago inicial{' '}
              <span aria-hidden="true" className="text-red-600">
                *
              </span>
              <select
                aria-label="Medio del pago inicial"
                className="field"
                required
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <FormField
              label="Referencia del pago inicial (opcional)"
              maxLength={160}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                required
                checked={initialReceived}
                onChange={(e) => setInitialReceived(e.target.checked)}
              />
              <FieldLabel label="Confirmo que recibí el pago inicial acordado" required />
            </label>
            {method === 'CASH' && (
              <p className="text-xs text-muted">
                Para efectivo debes tener caja abierta. Si el cobro falla, el plan conservará su
                estado anterior.
              </p>
            )}
          </fieldset>
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
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={
              form.busy ||
              (action === 'accept' &&
                (!confirmed ||
                  (initial > 0 &&
                    (!initialReceived || !occurredOn || !auth.can('PAYMENTS_WRITE')))))
            }
          >
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
