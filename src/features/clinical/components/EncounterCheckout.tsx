import { FieldLabel } from '../../../shared/ui/FieldLabel'
import { useState } from 'react'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { clinicToday } from '../../../shared/data/dateFormat'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { methods } from '../../finance/model/payments'
import { money } from '../../treatments/model/treatments'
import { notify } from '../../../shared/notifications/notifications'
import type { Encounter } from '../model/clinical'
import type { CheckoutPreview, CheckoutResult } from '../model/encounterWorkflow'
import { checkoutEncounter } from '../services/encounterWorkflowService'
export function EncounterCheckout({
  encounter,
  patientName,
  timeZone,
  onClose,
  onSaved,
}: {
  encounter: Encounter
  patientName?: string
  timeZone: string
  onClose: () => void
  onSaved: (result: CheckoutResult) => void
}) {
  const preview = useQueryData<CheckoutPreview>(
      '/api/v1/clinical/encounters/' + encounter.id + '/checkout',
    ),
    form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [method, setMethod] = useState('CASH'),
    [date, setDate] = useState(clinicToday(timeZone)),
    [reference, setReference] = useState('')
  return (
    <Modal
      title={encounter.status === 'DRAFT' ? 'Finalizar y registrar cobro' : 'Cobrar atención'}
      busy={form.busy}
      onClose={onClose}
    >
      {preview.loading && <p role="status">Preparando el cobro…</p>}
      {preview.error && (
        <p role="alert" className="error-box">
          {preview.error}
        </p>
      )}
      {preview.data && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void form.submit(
              () =>
                checkoutEncounter(encounter.id, {
                  requestKey: key,
                  version: encounter.version,
                  amount: preview.data!.amount,
                  occurredOn: date,
                  method,
                  reference,
                }),
              (result) => {
                notify('Atención cobrada. Los cargos individuales quedaron finalizados.')
                onSaved(result)
              },
            )
          }}
        >
          <div className="rounded-xl bg-brand-50 p-5">
            {patientName && <p className="mb-2 font-semibold">{patientName}</p>}
            <p className="text-sm">
              {encounter.reason} · {encounter.dentistName}
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {money(preview.data.amount, preview.data.currency)}
            </p>
            <p className="mt-2 text-sm">
              Saldo de {preview.data.individualCharges} cargo(s) individual(es).
            </p>
          </div>
          {preview.data.includedProcedures > 0 && (
            <p className="text-sm text-muted">
              {preview.data.includedProcedures} procedimiento(s) están incluidos en un plan. Sus
              sesiones no generan otro cargo; el saldo de ese plan se cobra desde la cuenta del
              paciente.
            </p>
          )}
          {preview.data.individualCharges === 0 ? (
            <p role="status">
              No hay cargos individuales abiertos para este cobro. Puedes finalizar la atención e ir
              a la cuenta del paciente.
            </p>
          ) : (
            <>
              {preview.data.amount > 0 && (
                <>
                  <FormField
                    label="Fecha del pago"
                    type="date"
                    max={clinicToday(timeZone)}
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <label className="field-label">
                    <FieldLabel label="Medio de pago" required />
                    <select
                      className="field"
                      required
                      aria-label="Medio de pago"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
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
                </>
              )}
              <p className="text-sm text-muted">
                {preview.data.amount > 0
                  ? 'Al confirmar se finalizará la atención, se registrará el pago con constancia y se cerrarán sus cargos. Para efectivo debe haber caja abierta.'
                  : 'Los cargos sin importe pendiente se cerrarán sin registrar un ingreso.'}
              </p>
              <Button disabled={form.busy}>Confirmar atención y cobro</Button>
            </>
          )}
          <Button variant="secondary" type="button" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </form>
      )}
    </Modal>
  )
}
