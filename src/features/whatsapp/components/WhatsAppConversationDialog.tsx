import { useEffect, useState } from 'react'
import { History, Info, Search, RefreshCw, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useQueryData } from '../../../shared/data/useQueryData'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { useWhatsAppReply } from '../hooks/useWhatsAppReply'
import { useChatTimeline } from '../hooks/useChatTimeline'
import { useConversationControl } from '../hooks/useConversationControl'
import { WhatsAppChat } from './WhatsAppChat'
import { WhatsAppReplyForm } from './WhatsAppReplyForm'
import { AgentConversationPanel } from './AgentConversationPanel'
import { controlLabels, requestLabels } from '../model/supervision'
import {
  messageDate,
  messageStatusLabels,
  type WhatsAppConnection,
  type WhatsAppConversation,
  type WhatsAppMessage,
} from '../model/whatsapp'

const reasonLabels: Record<string, string> = {
  OUTSIDE_HOURS: 'Fuera del horario del asistente',
  CLINICAL_QUERY: 'Consulta que necesita al profesional',
  RATE_LIMIT: 'El servicio del asistente está temporalmente ocupado',
  UNAUTHORIZED_INFORMATION: 'Solicitud de información no autorizada',
  PROVIDER_ERROR: 'No se pudo completar la atención automática',
  IDENTITY_UNCERTAIN: 'Recepción debe verificar la identidad',
}
export function WhatsAppConversationDialog({
  conversationId,
  connection,
  timeZone,
  dateFormat,
  onChanged,
  onClose,
}: {
  conversationId: string
  connection?: WhatsAppConnection
  timeZone: string
  dateFormat: string
  onChanged: () => void
  onClose: () => void
}) {
  const auth = useAuth()
  const [section, setSection] = useState<'information' | 'history'>()
  const [messageInfo, setMessageInfo] = useState<WhatsAppMessage>()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  const path = `/api/v1/whatsapp/conversations/${conversationId}`
  const contact = useQueryData<WhatsAppConversation>(path)
  const supervised = connection?.provider === 'KAPSO_SANDBOX' && !!connection.agentEnabled
  const control = useConversationControl(conversationId, supervised)
  const timeline = useChatTimeline(conversationId, query, direction, status)
  const reply = useWhatsAppReply(conversationId, () => {
    timeline.refresh()
    onChanged()
  })
  const shownMessage =
    messageInfo &&
    (timeline.items.find((item) => item.message.id === messageInfo.id)?.message || messageInfo)
  const busy = reply.busy || control.busy
  const canRespond = !supervised || (control.data?.mode === 'HUMAN' && !control.error)
  const canControl = auth.can('AGENT_CONTROL_WRITE') && supervised
  function refresh() {
    timeline.refresh()
    void control.refresh()
  }
  function clearSearch() {
    setSearch('')
    setQuery('')
    setDirection('')
    setStatus('')
    setSearchOpen(false)
  }
  return (
    <Modal title="Conversación de WhatsApp" variant="chat" onClose={onClose} busy={busy}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-line bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 sm:flex">
                <UserRound size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">
                  {contact.data?.contactName || 'Contacto de WhatsApp'}
                </h3>
                <p className="truncate text-xs text-muted">
                  {contact.data?.phone || 'Consultando contacto…'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="quiet"
                className="size-11 px-0"
                aria-label="Buscar mensajes"
                title="Buscar mensajes"
                onClick={() => (searchOpen ? clearSearch() : setSearchOpen(true))}
              >
                <Search size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="quiet"
                className="size-11 px-0"
                aria-label="Información de la conversación"
                title="Información de la conversación"
                onClick={() => setSection('information')}
              >
                <Info size={18} aria-hidden="true" />
              </Button>
              {(supervised || connection?.provider === 'TWILIO_SANDBOX') && (
                <Button
                  variant="quiet"
                  className="size-11 px-0"
                  aria-label="Historial del asistente"
                  title="Historial del asistente"
                  onClick={() => setSection('history')}
                >
                  <History size={18} aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="quiet"
                className="size-11 px-0"
                aria-label="Actualizar mensajes"
                title="Actualizar mensajes"
                disabled={timeline.loading}
                onClick={refresh}
              >
                <RefreshCw size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>
          {(contact.error || control.error) && (
            <p role="alert" className="error-box mt-2">
              {contact.error || control.error}
            </p>
          )}
          {supervised && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className={control.data?.mode === 'AUTO' ? 'status-active' : 'status-inactive'}>
                {controlLabels[control.data?.mode || ''] || 'Consultando atención…'}
              </span>
              {canControl && control.data && (
                <div className="flex flex-wrap gap-1">
                  {control.data.mode !== 'HUMAN' && (
                    <Button
                      className="px-3 text-xs"
                      disabled={busy}
                      onClick={() => control.change('HUMAN')}
                    >
                      Asumir conversación
                    </Button>
                  )}
                  {control.data.mode !== 'AUTO' && (
                    <Button
                      variant="secondary"
                      className="px-3 text-xs"
                      disabled={busy}
                      onClick={() => control.change('AUTO')}
                    >
                      Devolver al asistente
                    </Button>
                  )}
                  {control.data.mode !== 'CLOSED' && (
                    <Button
                      variant="quiet"
                      className="px-3 text-xs"
                      disabled={busy}
                      onClick={() => control.change('CLOSED')}
                    >
                      Cerrar conversación
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>
        {searchOpen && (
          <section
            aria-label="Buscar en la conversación"
            className="shrink-0 border-b border-line bg-white px-4 py-3 sm:px-6"
          >
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <label className="field-label text-xs">
                Buscar mensajes
                <input
                  className="field"
                  placeholder="Escribe una palabra…"
                  value={search}
                  maxLength={160}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="field-label text-xs">
                Dirección del mensaje
                <select
                  className="field"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="INBOUND">Recibidos</option>
                  <option value="OUTBOUND">Enviados</option>
                </select>
              </label>
              <label className="field-label text-xs">
                Estado del mensaje
                <select
                  className="field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.entries(messageStatusLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="quiet"
                className="self-end"
                onClick={clearSearch}
                aria-label="Cerrar búsqueda"
              >
                <X size={18} />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Resultados de búsqueda. Pulsa actualizar para revisar mensajes nuevos.
            </p>
          </section>
        )}
        <WhatsAppChat
          timeline={timeline}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onInfo={setMessageInfo}
        />
        {auth.can('WHATSAPP_WRITE') && connection?.enabled && connection.configured ? (
          <>
            {supervised && (
              <p className="shrink-0 border-t border-line bg-white px-4 py-2 text-xs text-muted sm:px-6">
                {canRespond
                  ? 'Atención manual. El asistente está pausado mientras respondes.'
                  : control.data?.mode === 'CLOSED'
                    ? 'Conversación cerrada. Asúmela para volver a atender.'
                    : control.data?.mode === 'HANDOFF'
                      ? 'El paciente necesita atención de recepción. Asume la conversación para responder.'
                      : 'El asistente atiende esta conversación. Asúmela cuando quieras responder personalmente.'}
              </p>
            )}
            <WhatsAppReplyForm
              reply={reply}
              connection={connection}
              disabled={!canRespond || control.busy}
            />
          </>
        ) : (
          !connection?.configured && (
            <p className="shrink-0 border-t border-line bg-white p-4 text-sm text-muted">
              El envío de mensajes no está disponible. Consulta al administrador.
            </p>
          )
        )}
      </div>
      {section === 'information' && (
        <Modal title="Información de la conversación" onClose={() => setSection(undefined)}>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Contacto</dt>
              <dd className="mt-1 font-medium">
                {contact.data?.contactName || 'Sin nombre'}
                <br />
                {contact.data?.phone}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Atención</dt>
              <dd className="mt-1 font-medium">
                {supervised ? controlLabels[control.data?.mode || ''] : 'Atención manual'}
                {control.data?.assignedName && (
                  <p className="mt-1 font-normal">Responsable: {control.data.assignedName}</p>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Paciente de la solicitud</dt>
              <dd className="mt-1 font-medium">{control.data?.patientName || 'Por identificar'}</dd>
            </div>
            <div>
              <dt className="text-muted">Solicitud</dt>
              <dd className="mt-1 font-medium">
                {requestLabels[control.data?.requestState || ''] || 'Sin solicitud en curso'}
              </dd>
            </div>
            {control.data?.reason && (
              <div className="sm:col-span-2">
                <dt className="text-muted">Motivo de atención</dt>
                <dd className="mt-1 break-words">
                  {reasonLabels[control.data.reason] || control.data.reason}
                </dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-muted">Resumen de la solicitud</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {control.data?.summary || 'Aún no hay una propuesta.'}
              </dd>
            </div>
          </dl>
          {control.data?.appointmentId && (
            <Link
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
              to={`/agenda?appointment=${control.data.appointmentId}`}
            >
              Consultar cita en la agenda
            </Link>
          )}
          <p className="mt-5 rounded-xl bg-canvas p-4 text-sm text-muted">
            Al devolver la atención al asistente, se espera un mensaje nuevo del paciente. Las
            solicitudes pendientes anteriores no se ejecutan.
          </p>
        </Modal>
      )}
      {section === 'history' && (
        <Modal title="Historial del asistente" onClose={() => setSection(undefined)}>
          <AgentConversationPanel
            conversationId={conversationId}
            canTest={false}
            timeZone={timeZone}
            dateFormat={dateFormat}
            onTest={() => {}}
            automatic={supervised}
          />
        </Modal>
      )}
      {shownMessage && (
        <Modal title="Información del mensaje" onClose={() => setMessageInfo(undefined)}>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted">Estado</dt>
              <dd className="mt-1 font-medium">{messageStatusLabels[shownMessage.status]}</dd>
            </div>
            <div>
              <dt className="text-muted">Fecha y hora</dt>
              <dd className="mt-1">{messageDate(shownMessage.createdAt, timeZone, dateFormat)}</dd>
            </div>
            {shownMessage.direction === 'OUTBOUND' && (
              <div>
                <dt className="text-muted">Intentos de envío</dt>
                <dd className="mt-1">{shownMessage.attempts}</dd>
              </div>
            )}
            {shownMessage.errorMessage && (
              <div>
                <dt className="text-muted">Detalle del envío</dt>
                <dd className="mt-1 break-words">{shownMessage.errorMessage}</dd>
              </div>
            )}
            {shownMessage.providerSid && (
              <details className="rounded-xl border border-line p-4">
                <summary className="min-h-11 cursor-pointer pt-2 font-medium">
                  Referencia del mensaje
                </summary>
                <p className="break-all font-mono text-xs">{shownMessage.providerSid}</p>
              </details>
            )}
          </dl>
        </Modal>
      )}
    </Modal>
  )
}
