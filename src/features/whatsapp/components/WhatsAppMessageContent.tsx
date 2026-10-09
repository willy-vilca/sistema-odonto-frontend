import { Check, CheckCheck, Clock3, CircleAlert, Info } from 'lucide-react'
import { messageDate, messageStatusLabels, type WhatsAppMessage } from '../model/whatsapp'

export function WhatsAppMessageContent({
  message,
  timeZone,
  dateFormat,
  onInfo,
}: {
  message: WhatsAppMessage
  timeZone: string
  dateFormat: string
  onInfo: () => void
}) {
  const outbound = message.direction === 'OUTBOUND'
  const failed = ['FAILED', 'UNKNOWN', 'UNSUPPORTED'].includes(message.status)
  const StatusIcon = failed
    ? CircleAlert
    : message.status === 'READ' || message.status === 'DELIVERED'
      ? CheckCheck
      : message.status === 'SENT'
        ? Check
        : Clock3
  const time = new Intl.DateTimeFormat('es-PE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(message.createdAt))
  return (
    <article
      data-message-id={message.id}
      data-direction={message.direction}
      className={'flex min-w-0 ' + (outbound ? 'justify-end' : 'justify-start')}
    >
      <div
        className={
          'group min-w-0 max-w-[90%] rounded-2xl border px-4 py-2.5 shadow-xs sm:max-w-[75%] ' +
          (outbound
            ? 'rounded-tr-sm border-brand-100 bg-brand-100'
            : 'rounded-tl-sm border-line bg-white')
        }
      >
        {outbound && (
          <p className="mb-1 text-[11px] font-semibold text-brand-700">
            {message.source === 'AGENT' ? 'Asistente' : 'Recepción'}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
          {message.body ||
            (message.kind === 'UNSUPPORTED'
              ? 'Mensaje en un formato no compatible'
              : 'Mensaje sin texto')}
        </p>
        {message.kind === 'TEMPLATE' && (
          <p className="mt-1 text-xs text-muted">Mensaje de plantilla</p>
        )}
        {message.kind === 'UNSUPPORTED' && (
          <p className="mt-1 text-xs text-muted">
            El asistente solo puede interpretar mensajes de texto.
          </p>
        )}
        <div className="-mr-2 mt-1 flex items-center justify-end gap-1.5 text-[11px] text-muted">
          <time
            dateTime={message.createdAt}
            title={messageDate(message.createdAt, timeZone, dateFormat)}
          >
            {time}
          </time>
          {outbound && (
            <span
              role="img"
              className={message.status === 'READ' ? 'text-sky-700' : failed ? 'text-red-700' : ''}
              aria-label={messageStatusLabels[message.status]}
              title={messageStatusLabels[message.status]}
            >
              <StatusIcon size={15} aria-hidden="true" />
            </span>
          )}
          <button
            type="button"
            onClick={onInfo}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-brand-700"
            aria-label={'Información del mensaje: ' + time}
            title="Información del mensaje"
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </div>
        {failed && (
          <p className="pb-1 text-xs font-medium text-red-700">
            {message.status === 'FAILED'
              ? 'No se pudo enviar. Consulta la información del mensaje.'
              : messageStatusLabels[message.status]}
          </p>
        )}
      </div>
    </article>
  )
}
