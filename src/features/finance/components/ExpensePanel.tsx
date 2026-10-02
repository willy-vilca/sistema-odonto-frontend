import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { financePost } from '../services/paymentService'
import { methods } from '../model/payments'
import { MovementList } from './MovementList'
export function ExpensePanel({
  currency,
  today,
  dateFormat,
  timeZone,
}: {
  currency: string
  today: string
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    [open, setOpen] = useState(false),
    [revision, setRevision] = useState(0)
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Egresos</h2>
          <p className="mt-2 text-sm text-muted">
            Gastos del consultorio con categoría, proveedor y sustento.
          </p>
        </div>
        {auth.can('EXPENSES_WRITE') && (
          <Button onClick={() => setOpen(true)}>Registrar egreso</Button>
        )}
      </div>
      <MovementList
        dateFormat={dateFormat}
        timeZone={timeZone}
        key={revision}
        expense
        today={today}
        onChanged={() => setRevision((n) => n + 1)}
      />
      {open && (
        <ExpenseForm
          currency={currency}
          today={today}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            setRevision((n) => n + 1)
          }}
        />
      )}
    </section>
  )
}
function ExpenseForm({
  currency,
  today,
  onClose,
  onSaved,
}: {
  currency: string
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [category, setCategory] = useState<PickedEntity[]>([]),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(today),
    [method, setMethod] = useState('CASH'),
    [reference, setReference] = useState(''),
    [supplier, setSupplier] = useState(''),
    [description, setDescription] = useState('')
  return (
    <Modal title="Registrar egreso" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(() => {
            if (!category[0]) throw Error('Selecciona la categoría del egreso.')
            return financePost('expenses', {
              requestKey: key,
              categoryId: category[0].id,
              currency,
              amount,
              occurredOn: date,
              method,
              reference,
              description,
              supplier,
            })
          }, onSaved)
        }}
      >
        <EntityPicker
          label="categoría del egreso"
          source={{
            endpoint: '/api/v1/finance/expense-categories',
            labelKey: 'name',
            filters: { active: 'true' },
          }}
          selected={category}
          onChange={setCategory}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Importe del egreso"
            required
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <FormField
            label="Fecha del egreso"
            required
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <label className="field-label">
          Medio del egreso
          <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(methods).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label="Proveedor (opcional)"
          maxLength={160}
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        />
        <FormField
          label="Referencia del egreso"
          maxLength={160}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <TextAreaField
          label="Concepto del egreso"
          required
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-muted">
          Moneda {currency}. Después de guardar podrás adjuntar imágenes o PDF como sustento.
        </p>
        {form.error && (
          <p role="alert" className="error-box">
            {form.error}
          </p>
        )}
        <Button disabled={form.busy}>Guardar egreso</Button>
      </form>
    </Modal>
  )
}
