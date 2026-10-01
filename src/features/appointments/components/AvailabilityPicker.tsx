import { usePagedList } from '../../../shared/data/usePagedList'
import { Button } from '../../../shared/ui/Button'
import { localTime, type Slot } from '../model/appointment'
export function AvailabilityPicker({
  dentistId,
  serviceId,
  duration,
  date,
  onSelect,
  appointmentId,
}: {
  dentistId: string
  serviceId: string | null
  duration: number | null
  date: string
  appointmentId?: string
  onSelect: (local: string) => void
}) {
  const list = usePagedList<Slot>(
    '/api/v1/appointments/availability',
    {
      dentistId,
      ...(appointmentId ? { appointmentId } : {}),
      date,
      ...(serviceId ? { serviceId } : { durationMinutes: String(duration ?? 0) }),
    },
    'startsAt',
  )
  return (
    <section className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <h3 className="text-sm font-semibold">Horarios disponibles</h3>
      <p className="text-xs text-muted">
        Sugerencias cada 15 minutos. También puedes escribir otra hora; se comprobará con las mismas
        reglas al reservar.
      </p>
      {list.error ? (
        <p role="alert" className="error-box">
          {list.error}
        </p>
      ) : list.loading ? (
        <p role="status" className="text-sm">
          Consultando disponibilidad…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.data?.items.map((slot) => (
              <Button
                key={slot.startsAt}
                type="button"
                variant="secondary"
                onClick={() => onSelect(slot.localStart)}
              >
                {localTime(slot.localStart)}
              </Button>
            ))}
          </div>
          {!list.data?.items.length && (
            <p className="text-sm text-muted">
              No hay intervalos disponibles para este día y duración.
            </p>
          )}
        </>
      )}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="quiet"
          disabled={list.loading || list.page === 0}
          onClick={() => list.setPage(list.page - 1)}
        >
          Anteriores
        </Button>
        <span className="self-center text-xs text-muted">
          {list.data?.totalElements ?? 0} horarios
        </span>
        <Button
          type="button"
          variant="quiet"
          disabled={list.loading || list.page + 1 >= (list.data?.totalPages ?? 0)}
          onClick={() => list.setPage(list.page + 1)}
        >
          Más horarios
        </Button>
      </div>
    </section>
  )
}
