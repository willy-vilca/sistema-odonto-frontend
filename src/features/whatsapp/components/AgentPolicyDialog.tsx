import { useId, useState } from 'react'
import { useQueryData } from '../../../shared/data/useQueryData'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import type { AgentPolicy } from '../model/supervision'
import { saveAgentPolicy } from '../services/supervisionService'
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
function time(minute: number) {
  return (
    String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
  )
}
function minute(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
export function AgentPolicyDialog({ onClose }: { onClose: () => void }) {
  const query = useQueryData<AgentPolicy>('/api/v1/whatsapp/agent/policy')
  return (
    <Modal title="Reglas y mensajes del agente" onClose={onClose}>
      {query.error ? (
        <p role="alert" className="error-box">
          {query.error}
        </p>
      ) : query.loading ? (
        <p role="status">Consultando reglas…</p>
      ) : (
        query.data && <PolicyForm initial={query.data} onClose={onClose} />
      )}
    </Modal>
  )
}
function PolicyForm({ initial, onClose }: { initial: AgentPolicy; onClose: () => void }) {
  const formId = useId()
  const [policy, setPolicy] = useState(initial)
  const form = useSaveForm()
  const [scheduleError, setScheduleError] = useState('')
  function set<K extends keyof AgentPolicy>(key: K, value: AgentPolicy[K]) {
    setPolicy((p) => ({ ...p, [key]: value }))
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (policy.schedule.some((p) => p.startMinute >= p.endMinute)) {
          setScheduleError('El fin debe ser posterior al inicio.')
          return
        }
        setScheduleError('')
        void form.submit(() => saveAgentPolicy(policy), onClose)
      }}
    >
      <p className="text-sm text-muted">
        Horario según la zona del consultorio. Sin jornadas, el agente atiende todos los días a
        cualquier hora. Fuera del horario deriva a recepción.
      </p>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        Permitir atención automática
      </label>
      <fieldset className="space-y-3">
        <legend className="font-semibold">Jornadas del agente</legend>
        {policy.schedule.map((p, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
            <label className="field-label">
              Día {i + 1}
              <select
                className="field"
                value={p.dayOfWeek}
                onChange={(e) =>
                  set(
                    'schedule',
                    policy.schedule.map((x, j) =>
                      j === i ? { ...x, dayOfWeek: Number(e.target.value) } : x,
                    ),
                  )
                }
              >
                {days.map((d, n) => (
                  <option key={d} value={n + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Inicio {i + 1}
              <input
                type="time"
                required
                className="field"
                value={time(p.startMinute)}
                onChange={(e) =>
                  set(
                    'schedule',
                    policy.schedule.map((x, j) =>
                      j === i ? { ...x, startMinute: minute(e.target.value) } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="field-label">
              Fin {i + 1}
              <input
                type="time"
                required
                className="field"
                disabled={p.endMinute === 1440}
                value={time(p.endMinute === 1440 ? 0 : p.endMinute)}
                onChange={(e) =>
                  set(
                    'schedule',
                    policy.schedule.map((x, j) =>
                      j === i ? { ...x, endMinute: minute(e.target.value) } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={p.endMinute === 1440}
                onChange={(e) =>
                  set(
                    'schedule',
                    policy.schedule.map((x, j) =>
                      j === i ? { ...x, endMinute: e.target.checked ? 1440 : 1080 } : x,
                    ),
                  )
                }
              />
              Hasta medianoche {i + 1}
            </label>
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                set(
                  'schedule',
                  policy.schedule.filter((_, j) => j !== i),
                )
              }
            >
              Quitar jornada {i + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={policy.schedule.length >= 28}
          onClick={() =>
            set('schedule', [
              ...policy.schedule,
              { dayOfWeek: 1, startMinute: 540, endMinute: 1080 },
            ])
          }
        >
          Añadir jornada
        </Button>
      </fieldset>
      {scheduleError && (
        <p role="alert" className="error-box">
          {scheduleError}
        </p>
      )}
      <label className="field-label">
        Anticipación mínima para cambios (minutos)
        <input
          type="number"
          className="field"
          min={0}
          max={43200}
          required
          value={policy.changeLeadMinutes}
          onChange={(e) => set('changeLeadMinutes', Number(e.target.value))}
        />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={policy.allowReschedule}
            onChange={(e) => set('allowReschedule', e.target.checked)}
          />
          Permitir reprogramación
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={policy.allowCancel}
            onChange={(e) => set('allowCancel', e.target.checked)}
          />
          Permitir cancelación
        </label>
      </div>
      {(
        [
          ['handoffText', 'Derivación a recepción'],
          ['clinicalText', 'Consulta clínica o posible urgencia'],
          ['closedText', 'Fuera de horario'],
          ['failureText', 'Fallo del agente'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="field-label">
          <label htmlFor={formId + key}>{label}</label>
          <textarea
            id={formId + key}
            required
            className="field min-h-24"
            maxLength={900}
            value={policy[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button disabled={form.busy}>Guardar reglas del agente</Button>
        <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
          Volver
        </Button>
      </div>
    </form>
  )
}
