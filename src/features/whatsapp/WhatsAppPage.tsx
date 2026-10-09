import { AgentPolicyDialog } from './components/AgentPolicyDialog'
import { controlLabels, requestLabels } from './model/supervision'
import { useEffect, useRef, useState } from 'react'
import { Info, Settings2 } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { useQueryData } from '../../shared/data/useQueryData'
import { usePagedList } from '../../shared/data/usePagedList'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
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
  const [policyOpen, setPolicyOpen] = useState(false)
  const [informationOpen, setInformationOpen] = useState(false)
  const [mode, setMode] = useState(''),
    [requestState, setRequestState] = useState('')
  const [selected, setSelected] = useState<string>()
  const [testPhone, setTestPhone] = useState<string>()
  const returnFocus = useRef<string | undefined>(undefined)
  const connection = useQueryData<WhatsAppConnection>('/api/v1/whatsapp/connection')
  const kapso = connection.data?.provider === 'KAPSO_SANDBOX'
  const managed = kapso && !!connection.data?.agentEnabled
  const conversations = usePagedList<WhatsAppConversation>(
    managed ? '/api/v1/whatsapp/agent/inbox' : '/api/v1/whatsapp/conversations',
    { direction: 'desc', ...(managed ? { mode, state: requestState } : {}) },
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
            Atiende a tus pacientes y supervisa las reservas del asistente desde un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {auth.can('SETTINGS_WRITE') && kapso && (
            <Button variant="secondary" onClick={() => setPolicyOpen(true)}>
              <Settings2 size={17} aria-hidden="true" /> Ajustes del asistente
            </Button>
          )}
          <Button variant="secondary" onClick={() => setInformationOpen(true)}>
            <Info size={17} aria-hidden="true" />
            Información del servicio
          </Button>
          <Button
            variant="secondary"
            onClick={conversations.reload}
            disabled={conversations.loading}
          >
            Actualizar conversaciones
          </Button>
        </div>
      </header>
      {connection.error && (
        <p role="alert" className="error-box">
          {connection.error}
        </p>
      )}
      {connection.data && (!connection.data.enabled || !connection.data.configured) && (
        <p role="alert" className="error-box">
          El envío y la atención automática no están disponibles. Consulta la información del
          servicio o contacta al administrador.
        </p>
      )}
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
              <div>
                <p className="line-clamp-2 whitespace-pre-wrap">
                  {row.lastMessagePreview || 'Mensaje sin texto'}
                </p>
                {row.mode && (
                  <span className="mt-2 block text-xs font-medium text-brand-700">
                    {controlLabels[row.mode]} ·{' '}
                    {requestLabels[row.requestState || 'INFORMATION_PENDING']}
                  </span>
                )}
                {row.patientName && (
                  <span className="mt-1 block text-xs text-muted">Paciente: {row.patientName}</span>
                )}
              </div>
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
        filters={
          managed && (
            <>
              <label className="field-label">
                Atención
                <select className="field" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="">Todos</option>
                  {Object.entries(controlLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Solicitud
                <select
                  className="field"
                  value={requestState}
                  onChange={(e) => setRequestState(e.target.value)}
                >
                  <option value="">Todas</option>
                  {Object.entries(requestLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )
        }
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
      {informationOpen && (
        <Modal title="Información del servicio" onClose={() => setInformationOpen(false)}>
          <div className="space-y-5">
            <WhatsAppConnectionCard
              connection={connection}
              canConfigure={auth.can('SETTINGS_WRITE')}
            />
            {(connection.data?.provider === 'TWILIO_SANDBOX' || connection.data?.agentEnabled) && (
              <AgentConfigurationCard
                canTest={auth.can('AGENT_TEST_WRITE')}
                onTest={() => setTestPhone('')}
              />
            )}
          </div>
        </Modal>
      )}
      {policyOpen && <AgentPolicyDialog onClose={() => setPolicyOpen(false)} />}
      {selected && (
        <WhatsAppConversationDialog
          key={selected}
          conversationId={selected}
          connection={connection.data}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onChanged={conversations.reload}
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
            setInformationOpen(false)
            setTestPhone(undefined)
            setSelected(id)
            conversations.reload()
          }}
        />
      )}
    </div>
  )
}
