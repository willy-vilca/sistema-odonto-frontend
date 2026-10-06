import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useQueryData } from '../../../shared/data/useQueryData'
import { agentStateLabels, type AgentProposal, type AgentRun } from '../model/agent'
import { messageDate } from '../model/whatsapp'
import { AgentRunDialog } from './AgentRunDialog'

export function AgentConversationPanel({
  conversationId,
  canTest,
  timeZone,
  dateFormat,
  onTest,
}: {
  conversationId: string
  canTest: boolean
  timeZone: string
  dateFormat: string
  onTest: () => void
}) {
  const [state, setState] = useState('')
  const [selected, setSelected] = useState<string>()
  const path = '/api/v1/whatsapp/conversations/' + conversationId + '/agent'
  const runs = usePagedList<AgentRun>(path + '/runs', { direction: 'desc', state }, 'createdAt')
  const proposal = useQueryData<AgentProposal | null>(path + '/proposal')
  const reloadRef = useRef(() => {})
  useEffect(() => {
    reloadRef.current = () => {
      runs.reload()
      proposal.reload()
    }
  }, [runs, proposal])
  const active = runs.data?.items.some(
    (run) => run.state === 'QUEUED' || run.state === 'PROCESSING',
  )
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => reloadRef.current(), 5000)
    return () => window.clearInterval(timer)
  }, [active])
  return (
    <section aria-label="Seguimiento del agente" className="space-y-4 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Seguimiento del agente</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => reloadRef.current()}>
            Actualizar agente
          </Button>
          {canTest && (
            <Button variant="secondary" onClick={onTest}>
              Añadir mensaje de prueba
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted">
        Respuestas preparadas en la aplicación. No se marcan como enviadas a WhatsApp.
      </p>
      {proposal.error && (
        <p role="alert" className="error-box">
          {proposal.error}
        </p>
      )}
      {proposal.data && (
        <div className="space-y-3 rounded-xl border border-line bg-brand-50 p-4">
          <h4 className="font-semibold">
            {proposal.data.state === 'CONFIRMED' ? 'Cita registrada' : 'Última propuesta'}
          </h4>
          <p className="text-sm">{proposal.data.summary}</p>
          {proposal.data.state === 'PENDING' && (
            <>
              <p className="text-sm">
                Revisa los datos y responde desde WhatsApp o desde la prueba de la aplicación:
              </p>
              <p className="select-all rounded-lg bg-white p-3 font-mono font-semibold">
                CONFIRMO {proposal.data.confirmationCode}
              </p>
              <p className="text-xs text-muted">
                Vence: {messageDate(proposal.data.expiresAt, timeZone, dateFormat)}. El horario no
                está retenido.
              </p>
            </>
          )}
          {proposal.data.appointmentId && (
            <Link className="font-semibold text-brand-700 underline" to="/agenda">
              Ver agenda · cita {proposal.data.appointmentId}
            </Link>
          )}
          {!['PENDING', 'CONFIRMED'].includes(proposal.data.state) && (
            <p className="text-sm">
              Esta propuesta ya no admite confirmación. Solicita un horario nuevo.
            </p>
          )}
        </div>
      )}
      <PagedTable
        list={runs}
        keyFor={(run) => run.id}
        columns={[
          {
            label: 'Ejecución',
            render: (run) => (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {messageDate(run.createdAt, timeZone, dateFormat)}
                </p>
                <span className={run.state === 'FAILED' ? 'status-inactive' : 'status-active'}>
                  {agentStateLabels[run.state]}
                </span>
                <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">
                  {run.responseText || run.errorMessage || 'Pendiente de interpretación.'}
                </p>
              </div>
            ),
          },
        ]}
        actions={(run) => (
          <Button variant="quiet" onClick={() => setSelected(run.id)}>
            Ver bitácora
          </Button>
        )}
        filters={
          <label className="field-label">
            Estado del agente
            <select
              className="field"
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(agentStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        }
      />
      {selected && (
        <AgentRunDialog
          id={selected}
          canTest={canTest}
          onChanged={() => reloadRef.current()}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  )
}
