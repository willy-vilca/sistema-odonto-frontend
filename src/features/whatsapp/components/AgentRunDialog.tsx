import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { useQueryData } from '../../../shared/data/useQueryData'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { agentStateLabels, agentToolLabels, type AgentDetail, type AgentStep } from '../model/agent'
import { retryAgentRun, retryAgentReply } from '../services/agentService'
import { messageStatusLabels } from '../model/whatsapp'

export function AgentRunDialog({
  id,
  canTest,
  onChanged,
  onClose,
}: {
  id: string
  canTest: boolean
  onChanged: () => void
  onClose: () => void
}) {
  const detail = useQueryData<AgentDetail>('/api/v1/whatsapp/agent/runs/' + id)
  const [kind, setKind] = useState('')
  const steps = usePagedList<AgentStep>(
    '/api/v1/whatsapp/agent/runs/' + id + '/steps',
    { kind },
    'ordinal',
  )
  const form = useSaveForm()
  const auth = useAuth()
  return (
    <Modal title="Bitácora del agente IA" onClose={onClose} busy={form.busy}>
      <div className="space-y-5">
        <Button
          variant="secondary"
          onClick={() => {
            detail.reload()
            steps.reload()
            onChanged()
          }}
        >
          Actualizar ejecución
        </Button>
        {detail.error ? (
          <p role="alert" className="error-box">
            {detail.error}
          </p>
        ) : detail.loading ? (
          <p role="status">Consultando ejecución…</p>
        ) : (
          detail.data && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="status-active">{agentStateLabels[detail.data.run.state]}</span>
                <span>
                  {detail.data.source === 'APP_TEST'
                    ? 'Prueba desde la aplicación'
                    : 'Mensaje real de WhatsApp'}
                </span>
                <span className="break-all">{detail.data.run.model}</span>
              </div>
              <div>
                <h3 className="font-semibold">Mensaje analizado</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {detail.data.incomingText}
                </p>
              </div>
              <div className="rounded-xl bg-brand-50 p-4">
                <h3 className="font-semibold">
                  {detail.data.reply
                    ? 'Respuesta del agente'
                    : 'Respuesta preparada · sin envío a WhatsApp'}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {detail.data.run.responseText || 'Todavía no hay una respuesta preparada.'}
                </p>
                {detail.data.reply && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="status-active">
                        {messageStatusLabels[detail.data.reply.status]}
                      </span>{' '}
                      · Intentos de envío: {detail.data.reply.attempts}
                    </p>
                    {detail.data.reply.errorMessage && (
                      <p role="alert" className="error-box">
                        {detail.data.reply.errorMessage}
                      </p>
                    )}
                    {detail.data.reply.providerSid && (
                      <p className="break-all text-xs text-muted">
                        Referencia de Kapso: {detail.data.reply.providerSid}
                      </p>
                    )}
                    {auth.can('WHATSAPP_WRITE') &&
                      detail.data.reply.status === 'FAILED' &&
                      !detail.data.reply.providerSid &&
                      detail.data.reply.attempts < 3 && (
                        <Button
                          variant="secondary"
                          disabled={form.busy}
                          onClick={() =>
                            void form.submit(
                              () => retryAgentReply(id),
                              () => {
                                detail.reload()
                                onChanged()
                              },
                            )
                          }
                        >
                          Reintentar envío de respuesta
                        </Button>
                      )}
                  </div>
                )}
              </div>
              {detail.data.run.errorMessage && (
                <p role="alert" className="error-box">
                  {detail.data.run.errorMessage} · {detail.data.run.errorCode}
                </p>
              )}
              {detail.data.metadata && (
                <p className="text-xs text-muted">
                  Flujo: {detail.data.metadata.flow_version} · Resultado:{' '}
                  {detail.data.metadata.operational_result}
                </p>
              )}
              {detail.data.change && (
                <div className="rounded-xl border border-line p-4 text-sm">
                  <h3 className="font-semibold">Cambio de cita · {detail.data.change.state}</h3>
                  <p className="mt-2 whitespace-pre-wrap">{detail.data.change.summary}</p>
                  <Link
                    to={'/agenda?appointment=' + detail.data.change.appointmentId}
                    className="inline-block min-h-11 py-3 font-semibold text-brand-700 underline"
                  >
                    Ver cita vinculada
                  </Link>
                </div>
              )}
              <p className="text-xs text-muted">
                Intentos: {detail.data.run.attempts} · Tokens de entrada:{' '}
                {detail.data.run.inputTokens} · Tokens de salida: {detail.data.run.outputTokens}
              </p>
              {detail.data.proposal?.appointmentId && (
                <Link
                  className="text-sm font-semibold text-brand-700 underline"
                  to={'/agenda?appointment=' + detail.data.proposal.appointmentId}
                >
                  Ver cita en la agenda · {detail.data.proposal.appointmentId}
                </Link>
              )}
              {canTest && detail.data.run.state === 'FAILED' && detail.data.run.attempts < 3 && (
                <Button
                  disabled={form.busy}
                  onClick={() =>
                    void form.submit(
                      () => retryAgentRun(id),
                      () => {
                        detail.reload()
                        onChanged()
                      },
                    )
                  }
                >
                  Reintentar análisis
                </Button>
              )}
            </>
          )
        )}
        <PagedTable
          list={steps}
          keyFor={(step) => step.id}
          columns={[
            {
              label: 'Acción',
              render: (step) => (
                <div className="space-y-2">
                  <p className="font-medium">
                    {step.ordinal}.{' '}
                    {step.kind === 'MODEL'
                      ? 'Consultó el modelo'
                      : agentToolLabels[step.name] || step.name}
                  </p>
                  <span className={step.state === 'OK' ? 'status-active' : 'status-inactive'}>
                    {step.state === 'OK' ? 'Correcto' : 'Rechazado'}
                  </span>
                  <details className="text-xs">
                    <summary className="min-h-11 cursor-pointer py-3">Datos de la acción</summary>
                    <p className="font-semibold">Argumentos</p>
                    <pre className="mt-2 max-w-full whitespace-pre-wrap break-all rounded-lg bg-canvas p-3">
                      {JSON.stringify(step.arguments, null, 2)}
                    </pre>
                    <p className="mt-3 font-semibold">Resultado</p>
                    <pre className="mt-2 max-w-full whitespace-pre-wrap break-all rounded-lg bg-canvas p-3">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </details>
                </div>
              ),
            },
          ]}
          filters={
            <label className="field-label">
              Tipo de acción
              <select
                className="field"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="MODEL">Modelo</option>
                <option value="TOOL">Herramienta</option>
                <option value="BOOKING">Reserva</option>
              </select>
            </label>
          }
        />
      </div>
    </Modal>
  )
}
