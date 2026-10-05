import type { Appointment } from '../model/appointment'
import { localTime, statusLabels } from '../model/appointment'
import { dateAdd, dayTitle, type CalendarView } from '../model/calendar'
export function AppointmentCalendar({
  items,
  view,
  from,
  selectedDate,
  onDay,
  onOpen,
  onOpenDay,
}: {
  items: Appointment[]
  view: CalendarView
  from: string
  selectedDate: string
  onDay: (date: string) => void
  onOpen: (a: Appointment) => void
  onOpenDay: (date: string) => void
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
            const visible = view === 'month' ? bookings.slice(0, 3) : bookings
            const remaining = bookings.length - visible.length
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
                {!bookings.length && view !== 'month' && (
                  <p className="py-5 text-center text-xs text-muted">Sin citas</p>
                )}
                <div className={view === 'month' ? 'hidden space-y-1.5 sm:block' : 'space-y-2'}>
                  {visible.map((a) => (
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
                          view === 'month' ? 'block truncate font-semibold' : 'block font-semibold'
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
                        {a.serviceName}
                      </span>
                      {view !== 'month' && (
                        <span className="mt-1 block text-[11px]">{statusLabels[a.status]}</span>
                      )}
                      {view === 'day' && (
                        <span className="mt-1 block text-muted">{a.dentistName}</span>
                      )}
                    </button>
                  ))}
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
                {view === 'month' && bookings.length > 0 && (
                  <button
                    type="button"
                    className="mt-auto min-h-11 w-full shrink-0 rounded-lg bg-brand-50 text-xs font-medium text-brand-700 sm:hidden"
                    onClick={() => onOpenDay(day)}
                    aria-label={bookings.length + ' citas el ' + dayTitle(day)}
                  >
                    {bookings.length} <span className="sr-only">citas</span>
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
