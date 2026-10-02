import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { useQueryData } from '../../../shared/data/useQueryData'
import { financePost } from '../services/paymentService'
import { money } from '../../treatments/model/treatments'
import type { OpenCharge } from '../model/payments'
export function ChargeFinanceForm({
  chargeId,
  action,
  today,
  onClose,
  onSaved,
}: {
  chargeId: string
  action: 'installments' | 'discount' | 'void'
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    balance = useQueryData<OpenCharge>('/api/v1/finance/charges/' + chargeId),
    [key] = useState(() => crypto.randomUUID()),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState(''),
    [rows, setRows] = useState([{ id: crypto.randomUUID(), dueOn: today, amount: '' }]),
    schedule = action === 'installments',
    title = schedule
      ? 'Programar cuotas'
      : action === 'discount'
        ? 'Registrar descuento'
        : 'Anular cargo'
  return (
    <Modal title={title} onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!balance.data) return
          const body = schedule
            ? {
                requestKey: key,
                chargeId,
                reason,
                installments: rows.map(({ dueOn, amount }) => ({ dueOn, amount })),
              }
            : {
                requestKey: key,
                reason,
                amount: action === 'void' ? String(balance.data.debt) : amount,
              }
          void form.submit(
            () =>
              financePost(schedule ? 'installments' : 'charges/' + chargeId + '/' + action, body),
            onSaved,
          )
        }}
      >
        {balance.data ? (
          <p className="rounded-xl bg-brand-50 p-4 text-sm">
            {balance.data.description} · Cargo neto:{' '}
            {money(balance.data.debt, balance.data.currency)} · Aplicado:{' '}
            {money(balance.data.applied, balance.data.currency)}.
          </p>
        ) : (
          <p role="status">{balance.error ?? 'Consultando saldo…'}</p>
        )}
        {schedule ? (
          <>
            <p className="text-sm text-muted">
              Distribuye el cargo neto completo. Lo ya pagado se aplica a los primeros vencimientos.
              Un nuevo calendario conserva el anterior y no crea deuda.
            </p>
            {rows.map((row, i) => (
              <div key={row.id} className="space-y-2 rounded-xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label={'Vencimiento ' + (i + 1)}
                    type="date"
                    required
                    value={row.dueOn}
                    onChange={(e) =>
                      setRows(rows.map((r, j) => (i === j ? { ...r, dueOn: e.target.value } : r)))
                    }
                  />
                  <FormField
                    label={'Importe cuota ' + (i + 1)}
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    required
                    value={row.amount}
                    onChange={(e) =>
                      setRows(rows.map((r, j) => (i === j ? { ...r, amount: e.target.value } : r)))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  disabled={rows.length === 1}
                  onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                >
                  Quitar cuota {i + 1}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={rows.length >= 60}
              onClick={() =>
                setRows([...rows, { id: crypto.randomUUID(), dueOn: today, amount: '' }])
              }
            >
              Añadir cuota
            </Button>
          </>
        ) : action === 'discount' ? (
          <FormField
            label="Importe del descuento"
            type="number"
            required
            min="0.01"
            max={balance.data?.pending ?? 0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        ) : (
          <p className="text-sm">
            La anulación conserva el cargo original y registra un ajuste por el importe completo.
            Primero libera o devuelve cualquier dinero aplicado.
          </p>
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
        <Button disabled={form.busy || !balance.data}>
          Confirmar {schedule ? 'calendario' : 'operación'}
        </Button>
      </form>
    </Modal>
  )
}
