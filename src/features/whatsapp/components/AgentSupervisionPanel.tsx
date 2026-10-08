import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { Button } from '../../../shared/ui/Button'
import { controlLabels, requestLabels, type Supervision } from '../model/supervision'
import { changeAgentControl } from '../services/supervisionService'

export function AgentSupervisionPanel({
  id,
  canControl,
  onChanged,
}: {
  id: string
  canControl: boolean
  onChanged: () => void
}) {
  const data = useQueryData<Supervision>('/api/v1/whatsapp/conversations/' + id + '/supervision')
  const [reason, setReason] = useState('')
  const form = useSaveForm()
  function change(mode: string) {
    const current = data.data
    if (!current) return
    void form.submit(
      () => changeAgentControl(id, mode, reason, current.generation),
      () => {
        data.reload()
        onChanged()
      },
    )
  }
  return (
    <section
      className="space-y-4 rounded-2xl border border-line bg-white p-4 sm:p-5"
      aria-label="Control de la conversación"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Control y solicitud</h3>
        <Button variant="quiet" onClick={data.reload}>
          Actualizar control
        </Button>
      </div>
      {data.error ? (
        <p role="alert" className="error-box">
          {data.error}
        </p>
      ) : data.loading ? (
        <p role="status">Consultando control…</p>
      ) : (
        data.data && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={data.data.mode === 'AUTO' ? 'status-active' : 'status-inactive'}>
                {controlLabels[data.data.mode]}
              </span>
              <span>{requestLabels[data.data.requestState]}</span>
            </div>
            {data.data.assignedName && (
              <p className="text-sm">Responsable: {data.data.assignedName}</p>
            )}
            {data.data.reason && <p className="text-sm text-muted">Motivo: {data.data.reason}</p>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Paciente de la solicitud</dt>
                <dd className="mt-1 font-medium">{data.data.patientName || 'Por identificar'}</dd>
              </div>
              <div>
                <dt className="text-muted">Resumen administrativo</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {data.data.summary || 'Aún no hay una propuesta'}
                </dd>
              </div>
            </dl>
            {data.data.appointmentId && (
              <Link
                to={'/agenda?appointment=' + data.data.appointmentId}
                className="inline-block min-h-11 py-3 text-sm font-semibold text-brand-700 underline"
              >
                Consultar cita vinculada en agenda
              </Link>
            )}
            {canControl && (
              <>
                <label className="field-label">
                  Motivo de atención o cierre
                  <input
                    className="field"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ejemplo: el paciente solicita ayuda con el cambio"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {data.data.mode !== 'HUMAN' && (
                    <Button disabled={form.busy} onClick={() => change('HUMAN')}>
                      Asumir conversación
                    </Button>
                  )}
                  {data.data.mode !== 'AUTO' && (
                    <Button variant="secondary" disabled={form.busy} onClick={() => change('AUTO')}>
                      Devolver al agente
                    </Button>
                  )}
                  {data.data.mode !== 'CLOSED' && (
                    <Button variant="quiet" disabled={form.busy} onClick={() => change('CLOSED')}>
                      Cerrar conversación
                    </Button>
                  )}
                </div>
              </>
            )}
            <p className="text-xs text-muted">
              Al asumir, se pausan acciones y respuestas automáticas pendientes. Al devolver, el
              paciente debe enviar un mensaje nuevo: las confirmaciones anteriores no se ejecutan.
            </p>
          </>
        )
      )}
    </section>
  )
}
