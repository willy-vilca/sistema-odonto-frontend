import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { financePost } from '../services/paymentService'
import type { Allocation, Movement } from '../model/payments'
import { money } from '../../treatments/model/treatments'
import { AllocationEditor } from './AllocationEditor'
const titles: Record<string, string> = {
  apply: 'Aplicar anticipo',
  release: 'Liberar aplicación',
  refund: 'Devolver dinero',
  reverse: 'Revertir pago',
  expenseReverse: 'Revertir egreso',
}
export function PaymentOperation({
  movement,
  action,
  today,
  onClose,
  onSaved,
}: {
  movement: Movement
  action: string
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [amount, setAmount] = useState(String(movement.effectiveAmount)),
    [reason, setReason] = useState(''),
    [date, setDate] = useState(today),
    [rows, setRows] = useState<Allocation[]>([]),
    allocation = action === 'apply' || action === 'release',
    reverse = action === 'reverse' || action === 'expenseReverse'
  return (
    <Modal title={titles[action]} onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          const body = allocation
            ? { requestKey: key, reason, allocations: rows }
            : {
                requestKey: key,
                reason,
                occurredOn: date,
                amount: reverse ? String(movement.effectiveAmount) : amount,
                releases: rows,
              }
          void form.submit(
            () =>
              financePost(
                (action === 'expenseReverse' ? 'expenses/' : 'payments/') +
                  movement.id +
                  '/' +
                  (action === 'expenseReverse' ? 'reverse' : action),
                body,
              ),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {movement.receiptCode ?? movement.description} · Vigente:{' '}
          {money(movement.effectiveAmount, movement.currency)} · Disponible:{' '}
          {money(movement.available, movement.currency)}. Se conserva el movimiento original.
        </p>
        {!allocation && (
          <FormField
            label="Fecha de la corrección"
            type="date"
            max={today}
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        {action === 'refund' && (
          <FormField
            label="Importe a devolver"
            type="number"
            min="0.01"
            max={movement.effectiveAmount}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
        {reverse && (
          <p className="text-sm">
            Se revierte el importe vigente completo. Las aplicaciones del pago se liberan
            automáticamente; el original y su constancia permanecen en el historial.
          </p>
        )}
        {!reverse && movement.patientId && (
          <AllocationEditor
            patientId={movement.patientId}
            currency={movement.currency}
            rows={rows}
            onChange={setRows}
            label={action === 'apply' ? 'Aplicación del anticipo' : 'Aplicaciones que se liberan'}
          />
        )}
        <TextAreaField
          label="Motivo de la operación"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy}>Confirmar operación</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.busy}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
