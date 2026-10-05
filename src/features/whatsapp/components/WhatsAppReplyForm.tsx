import { Button } from '../../../shared/ui/Button'
import { TextAreaField } from '../../../shared/ui/FormField'
import type { useWhatsAppReply } from '../hooks/useWhatsAppReply'
import type { WhatsAppConnection } from '../model/whatsapp'

export function WhatsAppReplyForm({
  reply,
  connection,
}: {
  reply: ReturnType<typeof useWhatsAppReply>
  connection: WhatsAppConnection
}) {
  return (
    <section
      className="space-y-3 rounded-2xl border border-line bg-canvas p-4 sm:p-5"
      aria-label="Responder por WhatsApp"
    >
      <h3 className="font-semibold">Respuesta de prueba</h3>
      <p className="text-sm text-muted">
        La respuesta se guarda antes de enviarse. Actualiza los mensajes para comprobar su estado;
        estar en cola no significa que ya se haya entregado.
      </p>
      {connection.sendMode === 'TEMPLATE' ? (
        <>
          <p className="text-sm text-muted">
            Este entorno utiliza una plantilla de Twilio. El contenido que recibirá el participante
            depende de la plantilla configurada.
          </p>
          <Button
            type="button"
            disabled={reply.busy || !connection.testTemplateConfigured}
            onClick={reply.sendTemplate}
          >
            {reply.busy ? 'Guardando respuesta…' : 'Enviar plantilla de prueba'}
          </Button>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            reply.sendText()
          }}
        >
          <TextAreaField
            label="Mensaje de respuesta"
            required
            maxLength={1600}
            disabled={reply.busy}
            value={reply.body}
            onChange={(event) => reply.setBody(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{reply.body.length}/1600 caracteres</p>
            <Button disabled={reply.busy || !reply.body.trim()}>
              {reply.busy ? 'Guardando respuesta…' : 'Enviar mensaje'}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
