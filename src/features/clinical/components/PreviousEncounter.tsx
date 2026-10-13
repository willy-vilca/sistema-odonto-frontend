import { useState } from 'react'
import { useQueryData } from '../../../shared/data/useQueryData'
import { Button } from '../../../shared/ui/Button'
import { useAuth } from '../../auth/hooks/useAuth'
import type { Encounter } from '../model/clinical'
import { formatLocalDate } from '../../../shared/data/dateFormat'

export function PreviousEncounter({
  patientId,
  dentistId,
  exclude,
}: {
  patientId: string
  dentistId?: string
  exclude?: string
}) {
  const auth = useAuth(),
    [open, setOpen] = useState(false)
  const url =
    open && dentistId
      ? '/api/v1/clinical/patients/' +
        patientId +
        '/previous-encounter?' +
        new URLSearchParams({ dentistId, ...(exclude ? { exclude } : {}) })
      : ''
  const result = useQueryData<Encounter | null>(url)
  if (!auth.can('CLINICAL_READ') || !dentistId) return null
  return (
    <section className="rounded-xl border border-line bg-canvas/50 p-4 space-y-3">
      <Button type="button" variant="quiet" onClick={() => setOpen(!open)}>
        {open ? 'Ocultar atención anterior' : 'Consultar atención anterior y pendientes'}
      </Button>
      {open &&
        (result.loading ? (
          <p role="status" className="text-sm">
            Consultando última atención…
          </p>
        ) : result.error ? (
          <p role="alert" className="error-box">
            {result.error}
          </p>
        ) : result.data ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">
              {formatLocalDate(result.data.attendedOn, 'DMY')} · {result.data.reason}
            </p>
            {(['evolution', 'diagnoses', 'indications'] as const).map((field, i) => (
              <div key={field}>
                <p className="font-medium">
                  {
                    ['Evolución', 'Diagnósticos', 'Indicaciones y notas para la siguiente visita'][
                      i
                    ]
                  }
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted">
                  {result.data?.content?.[field] || 'Sin notas registradas.'}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted">
              Referencia de la atención anterior. Las notas de esta nueva atención se registran por
              separado.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Todavía no hay una atención finalizada anterior para este paciente y profesional.
          </p>
        ))}
    </section>
  )
}
