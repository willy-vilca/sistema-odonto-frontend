import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { saveJson } from '../../../shared/api/http'
import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import type { AgreementInput } from '../model/treatments'

const amount = (cents: number) => (cents / 100).toFixed(2)
export function PaymentAgreementEditor({
  value,
  totalCents,
  onChange,
}: {
  value: AgreementInput
  totalCents: number
  onChange: (value: AgreementInput) => void
}) {
  const [count, setCount] = useState(3),
    [first, setFirst] = useState(''),
    [busy, setBusy] = useState(false)
  const setError = useErrorNotification()
  const initial = Math.round(Number(value.initialAmount || 0) * 100)
  const dues = value.installments.reduce(
    (sum, d) => sum + Math.round(Number(d.amount || 0) * 100),
    0,
  )
  const split = async () => {
    if (!first || count < 1 || count > 59 || totalCents - initial < count) {
      setError('Indica una primera fecha y un número de cuotas compatible con el saldo.')
      return
    }
    setBusy(true)
    try {
      const dates = await saveJson<string[]>('/api/v1/treatment-sessions/preview', {
        sessions: count,
        scheduling: { mode: 'FREQUENCY', firstDate: first, interval: 1, unit: 'MONTHS', dates: [] },
      })
      const base = Math.floor((totalCents - initial) / count)
      onChange({
        ...value,
        installments: dates.map((dueOn, i) => ({
          dueOn,
          amount: amount(i === count - 1 ? totalCents - initial - base * (count - 1) : base),
        })),
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo distribuir las cuotas.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details
      className="rounded-xl border border-line bg-canvas/50 p-4"
      open={initial > 0 || value.installments.length > 0 || undefined}
    >
      <summary className="min-h-11 cursor-pointer font-medium">
        Pago inicial y cuotas (opcional)
      </summary>
      <fieldset disabled={busy} className="mt-3 space-y-4">
        <p className="text-sm text-muted">
          Este acuerdo se incluirá en la proforma. El inicial se cobrará al aceptar y confirmar su
          recepción; las cuotas se crearán en la cuenta del paciente.
        </p>
        <FormField
          label="Pago inicial acordado"
          type="number"
          min="0"
          step="0.01"
          max={totalCents / 100}
          value={value.initialAmount}
          onChange={(e) => onChange({ ...value, initialAmount: e.target.value })}
        />
        <div className="rounded-xl bg-white p-3 text-sm">
          Total: {amount(totalCents)} · Inicial: {amount(initial)} · Resto:{' '}
          {amount(totalCents - initial)}
        </div>
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Distribuir en cuotas mensuales iguales
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField
              label="Número de cuotas"
              type="number"
              min={1}
              max={59}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <FormField
              label="Primer vencimiento"
              type="date"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            />
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void split()}>
              Calcular cuotas
            </Button>
          </div>
        </details>
        {value.installments.map((due, i) => (
          <fieldset key={i} className="rounded-xl border border-line p-3">
            <legend className="px-2 text-sm font-medium">Cuota acordada {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label={`Vencimiento acordado ${i + 1}`}
                required
                type="date"
                value={due.dueOn}
                onChange={(e) =>
                  onChange({
                    ...value,
                    installments: value.installments.map((d, j) =>
                      j === i ? { ...d, dueOn: e.target.value } : d,
                    ),
                  })
                }
              />
              <FormField
                label={`Importe de cuota acordada ${i + 1}`}
                required
                type="number"
                min="0.01"
                step="0.01"
                value={due.amount}
                onChange={(e) =>
                  onChange({
                    ...value,
                    installments: value.installments.map((d, j) =>
                      j === i ? { ...d, amount: e.target.value } : d,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="quiet"
                onClick={() =>
                  onChange({ ...value, installments: value.installments.filter((_, j) => j !== i) })
                }
              >
                Quitar cuota acordada {i + 1}
              </Button>
            </div>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={value.installments.length >= 59}
          onClick={() =>
            onChange({ ...value, installments: [...value.installments, { dueOn: '', amount: '' }] })
          }
        >
          Añadir cuota acordada
        </Button>
        {value.installments.length > 0 && (
          <p
            role={initial + dues !== totalCents ? 'alert' : undefined}
            className={
              initial + dues !== totalCents ? 'text-sm text-red-700' : 'text-sm text-brand-700'
            }
          >
            Inicial y cuotas: {amount(initial + dues)}{' '}
            {initial + dues === totalCents
              ? '· Distribución completa'
              : `· Falta distribuir ${amount(totalCents - initial - dues)}`}
          </p>
        )}
      </fieldset>
    </details>
  )
}
