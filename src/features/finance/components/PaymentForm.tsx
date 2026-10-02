import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { financePost } from '../services/paymentService'
import { methods, type Allocation, type Movement } from '../model/payments'
import { AllocationEditor } from './AllocationEditor'
export function PaymentForm({
  patientId,
  currency,
  today,
  onClose,
  onSaved,
}: {
  patientId: string
  currency: string
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(today),
    [method, setMethod] = useState('CASH'),
    [reference, setReference] = useState(''),
    [description, setDescription] = useState('Abono del paciente'),
    [rows, setRows] = useState<Allocation[]>([])
  return (
    <Modal title="Registrar abono" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              financePost<Movement>('payments', {
                requestKey: key,
                patientId,
                currency,
                amount,
                occurredOn: date,
                method,
                reference,
                description,
                allocations: rows,
              }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          Moneda: {currency}. Puedes aplicar el abono a varios cargos o conservarlo como anticipo
          disponible.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Importe del abono"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <FormField
            label="Fecha del abono"
            type="date"
            max={today}
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <label className="field-label">
          Medio de pago
          <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(methods).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label="Referencia del pago"
          maxLength={160}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <TextAreaField
          label="Concepto del abono"
          required
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <AllocationEditor
          patientId={patientId}
          currency={currency}
          rows={rows}
          onChange={setRows}
        />
        {form.error && (
          <p role="alert" className="error-box">
            {form.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy}>Guardar abono</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.busy}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
