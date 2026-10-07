import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useQueryData } from '../../../shared/data/useQueryData'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { useWhatsAppReply } from '../hooks/useWhatsAppReply'
import { WhatsAppMessageContent } from './WhatsAppMessageContent'
import { WhatsAppReplyForm } from './WhatsAppReplyForm'
import { AgentConversationPanel } from './AgentConversationPanel'
import {
  messageStatusLabels,
  type WhatsAppConnection,
  type WhatsAppConversation,
  type WhatsAppMessage,
} from '../model/whatsapp'

export function WhatsAppConversationDialog({
  conversationId,
  connection,
  timeZone,
  dateFormat,
  onChanged,
  onClose,
  onAgentTest,
}: {
  conversationId: string
  connection?: WhatsAppConnection
  timeZone: string
  dateFormat: string
  onChanged: () => void
  onClose: () => void
  onAgentTest: (phone: string) => void
}) {
  const auth = useAuth()
  const [messageDirection, setMessageDirection] = useState('')
  const [status, setStatus] = useState('')
  const path = '/api/v1/whatsapp/conversations/' + conversationId
  const conversation = useQueryData<WhatsAppConversation>(path)
  const messages = usePagedList<WhatsAppMessage>(
    path + '/messages',
    { direction: 'desc', messageDirection, status },
    'createdAt',
  )
  const reload = useCallback(() => {
    conversation.reload()
    messages.reload()
    onChanged()
  }, [conversation, messages, onChanged])
  const reloadRef = useRef(() => {})
  useEffect(() => {
    reloadRef.current = reload
  }, [reload])
  useEffect(() => {
    if (!connection?.agentEnabled) return
    const timer = window.setInterval(() => {
      if (document.querySelectorAll('dialog[open]').length > 1) return
      reloadRef.current()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [connection?.agentEnabled])
  const reply = useWhatsAppReply(conversationId, () => {
    messages.setPage(0)
    reload()
  })
  return (
    <Modal title="Conversación de WhatsApp" onClose={onClose} busy={reply.busy}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {conversation.error ? (
            <p role="alert" className="error-box">
              {conversation.error}
            </p>
          ) : conversation.loading ? (
            <p role="status" className="text-sm text-muted">
              Consultando contacto…
            </p>
          ) : (
            <div className="min-w-0">
              <h3 className="font-semibold break-words">
                {conversation.data?.contactName || 'Contacto de WhatsApp'}
              </h3>
              <p className="mt-1 break-all text-sm text-muted">{conversation.data?.phone}</p>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={reload}
            disabled={reply.busy || messages.loading || conversation.loading}
          >
            Actualizar mensajes
          </Button>
        </div>
        <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
          {connection?.provider === 'KAPSO_SANDBOX'
            ? connection.agentEnabled
              ? 'El agente atiende los mensajes por WhatsApp y registra la cita después de confirmar el paciente. Consulta debajo las propuestas, herramientas y estados de envío.'
              : 'Conexión manual con Kapso. Escribe una respuesta para comprobar su envío al teléfono. Estos mensajes no activan el agente ni generan citas.'
            : 'Consulta debajo la interpretación y acciones del agente. Las respuestas preparadas se muestran en la aplicación; los mensajes enviados manualmente conservan sus estados de entrega.'}
        </p>
        <PagedTable
          list={messages}
          keyFor={(message) => message.id}
          columns={[
            {
              label: 'Mensajes · más recientes primero',
              render: (message) => (
                <WhatsAppMessageContent
                  message={message}
                  timeZone={timeZone}
                  dateFormat={dateFormat}
                />
              ),
            },
          ]}
          filters={
            <>
              <label className="field-label min-w-0 basis-40">
                Dirección del mensaje
                <select
                  className="field"
                  value={messageDirection}
                  onChange={(event) => setMessageDirection(event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="INBOUND">Recibidos</option>
                  <option value="OUTBOUND">Enviados</option>
                </select>
              </label>
              <label className="field-label min-w-0 basis-40">
                Estado del mensaje
                <select
                  className="field"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.entries(messageStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
        />
        {(connection?.provider === 'TWILIO_SANDBOX' || connection?.agentEnabled) && (
          <AgentConversationPanel
            conversationId={conversationId}
            canTest={auth.can('AGENT_TEST_WRITE')}
            timeZone={timeZone}
            dateFormat={dateFormat}
            onTest={() => onAgentTest(conversation.data?.phone || '')}
            automatic={connection?.provider === 'KAPSO_SANDBOX' && connection.agentEnabled}
          />
        )}
        {auth.can('WHATSAPP_WRITE') &&
          connection?.enabled &&
          connection.configured &&
          conversation.data && <WhatsAppReplyForm reply={reply} connection={connection} />}
        {!connection?.configured && (
          <p className="text-sm text-muted">
            Completa la conexión para habilitar la respuesta de prueba.
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={reply.busy}>
          Volver a conversaciones
        </Button>
      </div>
    </Modal>
  )
}
