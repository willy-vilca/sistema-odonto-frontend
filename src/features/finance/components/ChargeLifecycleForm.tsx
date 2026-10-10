import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { financePost } from '../services/paymentService'
export function ChargeLifecycleForm({
  id,
  close,
  onClose,
  onSaved,
}: {
  id: string
  close: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const form = useSaveForm(),
    [key] = useState(() => crypto.randomUUID()),
    [reason, setReason] = useState(close ? 'Cargo pagado completamente' : '')
  return (
    <Modal title={close ? 'Finalizar cargo' : 'Reabrir cargo'} onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(
            () =>
              financePost('charges/' + id + '/' + (close ? 'close' : 'reopen'), {
                requestKey: key,
                reason,
              }),
            onSaved,
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm">
          {close
            ? 'Se retirará de la cuenta activa. Sus pagos e historial se conservan y sus cambios quedan bloqueados hasta reabrirlo.'
            : 'Volverá a la cuenta activa y permitirá ajustes y correcciones de pago según tus permisos.'}
        </p>
        <TextAreaField
          label="Motivo"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy}>{close ? 'Finalizar cargo' : 'Reabrir cargo'}</Button>
          <Button variant="secondary" type="button" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>
  )
}
