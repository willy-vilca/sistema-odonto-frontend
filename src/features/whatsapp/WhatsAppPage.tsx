import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { useQueryData } from '../../shared/data/useQueryData'
import { usePagedList } from '../../shared/data/usePagedList'
import { Button } from '../../shared/ui/Button'
import { PagedTable } from '../../shared/ui/PagedTable'
import { WhatsAppConnectionCard } from './components/WhatsAppConnectionCard'
import { WhatsAppConversationDialog } from './components/WhatsAppConversationDialog'
import { AgentConfigurationCard } from './components/AgentConfigurationCard'
import { AgentTestDialog } from './components/AgentTestDialog'
import { messageDate, type WhatsAppConnection, type WhatsAppConversation } from './model/whatsapp'

export function WhatsAppPage({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const auth = useAuth()
  return auth.can('WHATSAPP_READ') ? (
    <WhatsAppWorkspace timeZone={timeZone} dateFormat={dateFormat} />
  ) : (
    <p role="alert" className="error-box">
      No tienes permiso para consultar las conversaciones de WhatsApp.
    </p>
  )
}

function WhatsAppWorkspace({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const auth = useAuth()
  const [selected, setSelected] = useState<string>()
  const [testPhone, setTestPhone] = useState<string>()
  const returnFocus = useRef<string | undefined>(undefined)
  const connection = useQueryData<WhatsAppConnection>('/api/v1/whatsapp/connection')
  const kapso = connection.data?.provider === 'KAPSO_SANDBOX'
  const conversations = usePagedList<WhatsAppConversation>(
    '/api/v1/whatsapp/conversations',
    { direction: 'desc' },
    'lastMessageAt',
  )
  useEffect(() => {
    if (selected || conversations.loading || !returnFocus.current) return
    const trigger = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-conversation-trigger]'),
    ].find(
      (button) =>
        button.dataset.conversationTrigger === returnFocus.current &&
        button.getClientRects().length > 0,
    )
    trigger?.focus()
    returnFocus.current = undefined
  }, [selected, conversations.loading])
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Gestión · WhatsApp</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conversaciones</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Mensajes recibidos y respuestas de prueba, con referencias y estados verificables.
          </p>
        </div>
        <Button variant="secondary" onClick={conversations.reload} disabled={conversations.loading}>
          Actualizar conversaciones
        </Button>
      </header>
      <WhatsAppConnectionCard
        connection={connection}
        canConfigure={!!auth.session?.user?.roles.includes('ADMIN')}
      />
      {(connection.data?.provider === 'TWILIO_SANDBOX' || connection.data?.agentEnabled) && (
        <AgentConfigurationCard
          canTest={auth.can('AGENT_TEST_WRITE')}
          onTest={() => setTestPhone('')}
        />
      )}
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-5 text-sm text-brand-700">
        <MessageCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          {kapso
            ? connection.data?.agentEnabled
              ? 'Consulta los mensajes, las acciones del agente y los estados de entrega. Las reservas requieren una confirmación explícita del resumen; las consultas y negaciones no crean citas.'
              : 'Recibe mensajes del participante y responde con tu propio texto desde la conversación. El agente está desactivado en esta conexión manual.'
            : 'El agente prepara respuestas y propuestas en la aplicación. Las reservas requieren confirmar el resumen; el envío personalizado por WhatsApp se incorporará después.'}
        </p>
      </div>
      <PagedTable
        list={conversations}
        keyFor={(row) => row.id}
        columns={[
          {
            label: 'Contacto',
            render: (row) => (
              <div>
                <p className="font-medium">{row.contactName || 'Contacto de WhatsApp'}</p>
                <p className="mt-1 text-xs text-muted">{row.phone}</p>
              </div>
            ),
          },
          {
            label: 'Último mensaje',
            render: (row) => (
              <p className="line-clamp-2 whitespace-pre-wrap">
                {row.lastMessagePreview || 'Mensaje sin texto'}
              </p>
            ),
          },
          {
            label: 'Actividad',
            render: (row) => (
              <time dateTime={row.lastMessageAt} className="text-muted">
                {messageDate(row.lastMessageAt, timeZone, dateFormat)}
              </time>
            ),
          },
        ]}
        actions={(row) => (
          <Button
            variant="quiet"
            data-conversation-trigger={row.id}
            onClick={() => setSelected(row.id)}
          >
            Ver conversación
          </Button>
        )}
      />
      <p className="text-xs text-muted">
        Se muestran los mensajes recibidos por esta conexión desde su activación. No se importa el
        historial previo de los chats del teléfono.
      </p>
      {selected && (
        <WhatsAppConversationDialog
          conversationId={selected}
          connection={connection.data}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onChanged={conversations.reload}
          onAgentTest={(phone) => setTestPhone(phone)}
          onClose={() => {
            returnFocus.current = selected
            setSelected(undefined)
          }}
        />
      )}
      {testPhone !== undefined && (
        <AgentTestDialog
          phone={testPhone}
          onClose={() => setTestPhone(undefined)}
          onQueued={(id) => {
            setTestPhone(undefined)
            setSelected(id)
            conversations.reload()
          }}
        />
      )}
    </div>
  )
}
