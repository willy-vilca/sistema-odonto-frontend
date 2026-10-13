import { useEffect, useState } from 'react'
import { saveJson, errorMessage } from '../../../shared/api/http'
import { FormField } from '../../../shared/ui/FormField'
import { Button } from '../../../shared/ui/Button'
import type { SessionScheduling } from '../model/treatments'
import { formatLocalDate } from '../../../shared/data/dateFormat'

export function SessionSchedulingEditor({
  value,
  sessions,
  duration,
  index,
  onChange,
  onDuration,
}: {
  value?: SessionScheduling
  sessions: number
  duration: number
  index: number
  onChange: (value: SessionScheduling) => void
  onDuration: (value: number) => void
}) {
  const scheduling = value ?? { mode: 'NONE', dates: [] }
  const [preview, setPreview] = useState<{ key: string; dates: (string | null)[]; error?: string }>(
    { key: '', dates: [] },
  )
  const key = JSON.stringify({ sessions, scheduling })
  const ready =
    scheduling.mode === 'DATES' ||
    (scheduling.mode === 'FREQUENCY' && !!scheduling.firstDate && !!scheduling.interval)
  useEffect(() => {
    if (!ready || sessions < 1 || sessions > 100) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void saveJson<(string | null)[]>('/api/v1/treatment-sessions/preview', JSON.parse(key))
        .then((dates) => {
          if (!controller.signal.aborted) setPreview({ key, dates })
        })
        .catch((error) => {
          if (!controller.signal.aborted) setPreview({ key, dates: [], error: errorMessage(error) })
        })
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, ready, sessions])
  const update = (change: Partial<SessionScheduling>) => onChange({ ...scheduling, ...change })
  return (
    <details className="rounded-xl border border-line bg-canvas/50 p-4">
      <summary className="min-h-11 cursor-pointer font-medium">
        Programar sesiones {index} (opcional)
      </summary>
      <div className="mt-3 space-y-4">
        <label className="field-label">
          Programación del tratamiento {index}
          <select
            aria-label={`Programación del tratamiento ${index}`}
            className="field"
            value={scheduling.mode}
            onChange={(e) =>
              update({
                mode: e.target.value as SessionScheduling['mode'],
                dates: [],
                interval: scheduling.interval ?? 1,
                unit: scheduling.unit ?? 'DAYS',
              })
            }
          >
            <option value="NONE">Coordinar las fechas después</option>
            <option value="DATES">Fechas individuales</option>
            <option value="FREQUENCY">Repetir por frecuencia</option>
          </select>
        </label>
        <FormField
          label={`Duración prevista de cada sesión ${index} (minutos)`}
          type="number"
          min={1}
          max={1440}
          required
          value={duration}
          onChange={(e) => onDuration(Number(e.target.value))}
        />
        {scheduling.mode === 'DATES' &&
          Array.from({ length: Math.min(100, Math.max(0, sessions)) }, (_, i) => (
            <FormField
              key={i}
              label={`Fecha de la sesión ${i + 1} del tratamiento ${index} (opcional)`}
              type="date"
              value={scheduling.dates[i] ?? ''}
              onChange={(e) => {
                const dates = Array.from({ length: sessions }, (_, j) =>
                  j === i ? e.target.value || null : (scheduling.dates[j] ?? null),
                )
                update({ dates })
              }}
            />
          ))}
        {scheduling.mode === 'FREQUENCY' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label={`Primera sesión del tratamiento ${index}`}
              type="date"
              required
              value={scheduling.firstDate ?? ''}
              onChange={(e) => update({ firstDate: e.target.value })}
            />
            <FormField
              label={`Repetir cada ${index}`}
              type="number"
              min={1}
              max={365}
              required
              value={scheduling.interval ?? 1}
              onChange={(e) =>
                update({ interval: Number(e.target.value), unit: scheduling.unit ?? 'DAYS' })
              }
            />
            <label className="field-label">
              Unidad de frecuencia {index}
              <select
                aria-label={`Unidad de frecuencia ${index}`}
                className="field"
                value={scheduling.unit ?? 'DAYS'}
                onChange={(e) =>
                  update({
                    unit: e.target.value as SessionScheduling['unit'],
                    interval: scheduling.interval ?? 1,
                  })
                }
              >
                <option value="DAYS">Días</option>
                <option value="WEEKS">Semanas</option>
                <option value="MONTHS">Meses</option>
              </select>
            </label>
          </div>
        )}
        {ready && preview.key === key && (
          <div className="rounded-xl bg-white p-3 text-sm">
            {preview.error ? (
              <p role="alert" className="text-red-700">
                {preview.error}
              </p>
            ) : (
              <>
                <p className="font-medium">Fechas previstas</p>
                <p className="mt-1 leading-6">
                  {preview.dates
                    .map((d, i) => `${i + 1}: ${d ? formatLocalDate(d, 'DMY') : 'por coordinar'}`)
                    .join(' · ')}
                </p>
                {scheduling.mode === 'FREQUENCY' && (
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => update({ mode: 'DATES', dates: preview.dates })}
                  >
                    Ajustar estas fechas individualmente
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        <p className="text-xs text-muted">
          Al aceptar el plan aparecerán en la agenda. No ocuparán horario hasta que asignes una
          hora.
        </p>
      </div>
    </details>
  )
}
