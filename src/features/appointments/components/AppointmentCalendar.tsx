import type { Appointment } from '../model/appointment'
import { localTime, statusLabels } from '../model/appointment'
import { dateAdd, dayTitle, type CalendarView } from '../model/calendar'
import type { ScheduledSession } from '../../treatments/model/treatments'
export function AppointmentCalendar({
  items,
  view,
  from,
  selectedDate,
  onDay,
  onOpen,
  onOpenDay,
  pendingSessions = [],
  onOpenSession,
}: {
  items: Appointment[]
  view: CalendarView
  from: string
  selectedDate: string
  onDay: (date: string) => void
  onOpen: (a: Appointment) => void
  onOpenDay: (date: string) => void
  pendingSessions?: ScheduledSession[]
  onOpenSession?: (session: ScheduledSession) => void
}) {
  const days = Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, i) =>
    dateAdd(from, i),
  )
  return (
    <section
      aria-label="Calendario de citas"
      className="overflow-hidden rounded-2xl border border-line bg-white"
    >
      {view === 'month' && (
        <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-semibold text-muted">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div className="py-3" key={d}>
              {d}
            </div>
          ))}
        </div>
      )}
      <div
        className={view === 'week' ? 'overflow-x-auto' : ''}
        tabIndex={view === 'week' ? 0 : undefined}
        role={view === 'week' ? 'region' : undefined}
        aria-label={view === 'week' ? 'Semana: desliza para ver los días' : undefined}
      >
        <div
          className={
            view === 'month'
              ? 'grid grid-cols-7'
              : view === 'week'
                ? 'grid min-w-[700px] grid-cols-7'
                : 'grid grid-cols-1'
          }
        >
          {days.map((day) => {
            const bookings = items.filter((a) => a.localStart.slice(0, 10) === day)
            const pending = pendingSessions.filter((s) => s.plannedOn === day)
            const entries = [
              ...pending.map((session) => ({ session, appointment: null })),
              ...bookings.map((appointment) => ({ appointment, session: null })),
            ]
            const visible = view === 'month' ? entries.slice(0, 3) : entries
            const remaining = entries.length - visible.length
            return (
              <div
                key={day}
                className={
                  'min-w-0 border-r border-b border-line p-2 sm:p-3 ' +
                  (view === 'month' ? 'flex h-28 flex-col sm:h-[336px]' : 'min-h-72') +
                  (view === 'month' && day.slice(0, 7) !== selectedDate.slice(0, 7)
                    ? ' bg-canvas/70'
                    : '')
                }
              >
                <button
                  type="button"
                  onClick={() => onDay(day)}
                  aria-label={'Ver día ' + dayTitle(day)}
                  className={
                    'mb-2 flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg text-xs font-semibold sm:text-sm ' +
                    (day === selectedDate
                      ? 'bg-brand-700 text-white'
                      : 'text-muted hover:bg-canvas')
                  }
                >
                  {view === 'month' ? Number(day.slice(8)) : dayTitle(day)}
                </button>
                {!entries.length && view !== 'month' && (
                  <p className="py-5 text-center text-xs text-muted">Sin citas</p>
                )}
                <div className={view === 'month' ? 'hidden space-y-1.5 sm:block' : 'space-y-2'}>
                  {visible.map(({ session, appointment: a }) =>
                    session ? (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => onOpenSession?.(session)}
                        aria-label={`Hora pendiente · ${session.patientName} · ${session.description} · Sesión ${session.sessionNumber}`}
                        className="block min-h-11 w-full rounded-xl border-l-3 border-amber-500 bg-amber-50 p-2 text-left text-xs text-amber-950 hover:shadow-sm"
                      >
                        <span className="block truncate font-semibold">Hora pendiente</span>
                        <span className="mt-1 block truncate font-medium">
                          {session.patientName}
                        </span>
                        <span className="block truncate text-[11px]">
                          Sesión {session.sessionNumber} · {session.description}
                        </span>
                      </button>
                    ) : a ? (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onOpen(a)}
                        aria-label={`${localTime(a.localStart)}–${localTime(a.localEnd)} · ${a.patientName} · ${a.serviceName} · ${a.dentistName} · ${statusLabels[a.status]}`}
                        className={
                          'block min-h-11 w-full rounded-xl border-l-3 text-left text-xs transition hover:shadow-sm ' +
                          (view === 'month' ? 'p-2 ' : 'p-2.5 ') +
                          (a.status === 'CANCELLED'
                            ? 'border-slate-300 bg-canvas text-muted'
                            : 'border-brand-700 bg-brand-50 text-ink')
                        }
                      >
                        <span
                          className={
                            view === 'month'
                              ? 'block truncate font-semibold'
                              : 'block font-semibold'
                          }
                        >
                          {localTime(a.localStart)}–{localTime(a.localEnd)}
                        </span>
                        <span
                          className={
                            view === 'month'
                              ? 'block truncate font-medium'
                              : 'mt-1 block font-medium break-words'
                          }
                          title={a.patientName}
                        >
                          {a.patientName}
                        </span>
                        <span
                          className={
                            view === 'month'
                              ? 'block truncate text-[11px]'
                              : 'mt-1 block text-[11px] break-words'
                          }
                          title={a.serviceName}
                        >
                          {a.planItemId
                            ? `Sesión ${a.treatmentSessionNumber} · ${a.serviceName}`
                            : a.serviceName}
                        </span>
                        {view !== 'month' && (
                          <span className="mt-1 block text-[11px]">{statusLabels[a.status]}</span>
                        )}
                        {view === 'day' && (
                          <span className="mt-1 block text-muted">{a.dentistName}</span>
                        )}
                      </button>
                    ) : null,
                  )}
                </div>
                {view === 'month' && remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    aria-label={`Ver ${remaining} ${remaining === 1 ? 'cita' : 'citas'} más el ${dayTitle(day)}`}
                    className="mt-auto hidden min-h-11 w-full shrink-0 rounded-lg text-xs font-semibold text-brand-700 hover:bg-brand-50 sm:block"
                  >
                    +{remaining} {remaining === 1 ? 'cita' : 'citas'} más
                  </button>
                )}
                {view === 'month' && entries.length > 0 && (
                  <button
                    type="button"
                    className="mt-auto min-h-11 w-full shrink-0 rounded-lg bg-brand-50 text-xs font-medium text-brand-700 sm:hidden"
                    onClick={() => onOpenDay(day)}
                    aria-label={entries.length + ' citas el ' + dayTitle(day)}
                  >
                    {entries.length} <span className="sr-only">citas</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
