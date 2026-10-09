import { Send } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import type { useWhatsAppReply } from '../hooks/useWhatsAppReply'
import type { WhatsAppConnection } from '../model/whatsapp'

export function WhatsAppReplyForm({
  reply,
  connection,
  disabled = false,
}: {
  reply: ReturnType<typeof useWhatsAppReply>
  connection: WhatsAppConnection
  disabled?: boolean
}) {
  if (connection.sendMode === 'TEMPLATE')
    return (
      <div className="p-4">
        <Button
          disabled={disabled || reply.busy || !connection.testTemplateConfigured}
          onClick={reply.sendTemplate}
        >
          {reply.busy ? 'Enviando…' : 'Enviar plantilla'}
        </Button>
      </div>
    )
  return (
    <form
      aria-label="Responder por WhatsApp"
      className="border-t border-line bg-white px-4 py-3 sm:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled) reply.sendText()
      }}
    >
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="whatsapp-reply">
            Mensaje de respuesta
          </label>
          <textarea
            id="whatsapp-reply"
            className="field max-h-36 min-h-12 resize-y text-sm"
            rows={2}
            maxLength={1600}
            placeholder={disabled ? 'Asume la conversación para responder' : 'Escribe un mensaje…'}
            disabled={disabled || reply.busy}
            value={reply.body}
            onChange={(event) => reply.setBody(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                window.matchMedia('(pointer: fine)').matches
              ) {
                event.preventDefault()
                if (!disabled) reply.sendText()
              }
            }}
          />
        </div>
        <Button
          aria-label="Enviar mensaje"
          className="mb-1 shrink-0 px-3 sm:px-4"
          disabled={disabled || reply.busy || !reply.body.trim()}
        >
          <Send size={18} aria-hidden="true" />
          <span className="hidden sm:inline">{reply.busy ? 'Enviando…' : 'Enviar'}</span>
        </Button>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span className="hidden sm:inline">
          Enter para enviar · Mayús + Enter para una nueva línea
        </span>
        <span className="ml-auto">{reply.body.length}/1600</span>
      </div>
    </form>
  )
}
