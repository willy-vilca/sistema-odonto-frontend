import { useRef, useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { submitAgentTest } from '../services/agentService'

export function AgentTestDialog({
  phone = '',
  onQueued,
  onClose,
}: {
  phone?: string
  onQueued: (conversationId: string) => void
  onClose: () => void
}) {
  const [contactPhone, setPhone] = useState(phone)
  const [contactName, setName] = useState('')
  const [body, setBody] = useState('')
  const form = useSaveForm()
  const attempt = useRef<{ signature: string; key: string } | undefined>(undefined)
  return (
    <Modal title="Probar agente IA" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          const signature = JSON.stringify([contactPhone.trim(), contactName.trim(), body.trim()])
          if (attempt.current?.signature !== signature)
            attempt.current = { signature, key: crypto.randomUUID() }
          let queuedConversation = ''
          void form.submit(
            async () => {
              const result = await submitAgentTest({
                phone: contactPhone.trim(),
                contactName: contactName.trim(),
                body: body.trim(),
                requestKey: attempt.current!.key,
              })
              queuedConversation = result.conversationId
            },
            () => onQueued(queuedConversation),
          )
        }}
      >
        <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
          Utiliza los pacientes y la agenda actuales. Esta entrada se identifica como prueba desde
          la aplicación y no se envía al teléfono. Una cita solo se guarda después de confirmar su
          propuesta con el código indicado.
        </p>
        <label className="field-label">
          Teléfono del contacto
          <input
            className="field"
            type="tel"
            required
            pattern="\+[1-9][0-9]{7,14}"
            maxLength={16}
            value={contactPhone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={form.busy}
            placeholder="+51987654321"
          />
        </label>
        <p className="text-xs text-muted">
          Usa el mismo teléfono de la ficha del paciente para vincularlo.
        </p>
        <label className="field-label">
          Nombre del contacto (opcional)
          <input
            className="field"
            maxLength={120}
            value={contactName}
            onChange={(event) => setName(event.target.value)}
            disabled={form.busy}
          />
        </label>
        <label className="field-label">
          Mensaje para el agente
          <textarea
            className="field min-h-32"
            required
            maxLength={4096}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={form.busy}
            placeholder="Soy Carlos Ruiz Vega. Quiero una limpieza dental mañana a las 9:00 am."
          />
        </label>
        <Button disabled={form.busy}>{form.busy ? 'Guardando…' : 'Analizar mensaje'}</Button>
      </form>
    </Modal>
  )
}
