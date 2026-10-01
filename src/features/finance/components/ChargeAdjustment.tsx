import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { adjustCharge } from '../services/financeService'
import type { Charge } from '../model/finance'
import { money } from '../../treatments/model/treatments'
export function ChargeAdjustment({
  charge,
  onClose,
  onSaved,
}: {
  charge: Charge
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState('')
  return (
    <Modal title="Ajustar cargo" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () => adjustCharge(charge.id, { requestKey: key, amount, reason }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {charge.description} · Cargo original {money(charge.amount, charge.currency)}. El ajuste
          conserva el movimiento original.
        </p>
        <FormField
          label="Variación del importe"
          type="number"
          step="0.01"
          min="-9999999999.99"
          max="9999999999.99"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted">
          Un importe negativo reduce la deuda; uno positivo la aumenta. No registra dinero recibido.
        </p>
        <TextAreaField
          label="Motivo del ajuste"
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
          <Button disabled={form.busy}>Registrar ajuste</Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
