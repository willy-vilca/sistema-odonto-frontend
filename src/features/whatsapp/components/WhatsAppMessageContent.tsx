import { messageDate, messageStatusLabels, type WhatsAppMessage } from '../model/whatsapp'

export function WhatsAppMessageContent({
  message,
  timeZone,
  dateFormat,
}: {
  message: WhatsAppMessage
  timeZone: string
  dateFormat: string
}) {
  const outbound = message.direction === 'OUTBOUND'
  return (
    <article className={'space-y-3 rounded-xl p-4 ' + (outbound ? 'bg-brand-50' : 'bg-canvas')}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold">
          {message.source === 'APP_TEST'
            ? 'Entrada de prueba desde la aplicación'
            : outbound
              ? 'Respuesta del consultorio'
              : 'Mensaje del contacto'}
        </span>
        <time dateTime={message.createdAt} className="text-muted">
          {messageDate(message.createdAt, timeZone, dateFormat)}
        </time>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">
        {message.body || 'Mensaje sin texto'}
      </p>
      {message.kind === 'TEMPLATE' && (
        <p className="text-xs text-muted">Plantilla de prueba. Su contenido se define en Twilio.</p>
      )}
      {message.kind === 'UNSUPPORTED' && (
        <p className="text-xs text-muted">
          En esta etapa se reciben textos. Este formato no será interpretado por el agente.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            message.status === 'FAILED' ||
            message.status === 'UNSUPPORTED' ||
            message.status === 'UNKNOWN'
              ? 'status-inactive'
              : 'status-active'
          }
        >
          {messageStatusLabels[message.status]}
        </span>
        {outbound && (
          <span className="text-xs text-muted">Intentos de envío: {message.attempts}</span>
        )}
      </div>
      {message.errorMessage && (
        <p className="text-sm text-muted">
          {message.errorMessage}
          {message.errorCode ? ' · Código ' + message.errorCode : ''}
        </p>
      )}
      {message.providerSid && (
        <details className="text-xs text-muted">
          <summary className="min-h-11 cursor-pointer pt-3">
            {message.source === 'KAPSO' ? 'Referencia de Kapso' : 'Referencia de Twilio'}
          </summary>
          <p className="break-all pt-1">{message.providerSid}</p>
        </details>
      )}
    </article>
  )
}
