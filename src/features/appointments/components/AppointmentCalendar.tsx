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
}: {
  items: Appointment[]
  view: CalendarView
  from: string
  selectedDate: string
  onDay: (date: string) => void
  onOpen: (a: Appointment) => void
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
            return (
              <div
                key={day}
                className={
                  'min-w-0 border-r border-b border-line p-2 sm:p-3 ' +
                  (view === 'month' ? 'min-h-28 sm:min-h-36' : 'min-h-72') +
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
                    'mb-2 flex min-h-11 w-full items-center justify-center rounded-lg text-xs font-semibold sm:text-sm ' +
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
                <div className={view === 'month' ? 'hidden space-y-2 sm:block' : 'space-y-2'}>
                  {bookings.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a)}
                      className={
                        'block min-h-11 w-full rounded-xl border-l-3 p-2.5 text-left text-xs transition hover:shadow-sm ' +
                        (a.status === 'CANCELLED'
                          ? 'border-slate-300 bg-canvas text-muted'
                          : 'border-brand-700 bg-brand-50 text-ink')
                      }
                    >
                      <span className="block font-semibold">
                        {localTime(a.localStart)}–{localTime(a.localEnd)}
                      </span>
                      <span className="mt-1 block font-medium break-words">{a.patientName}</span>
                      <span className="mt-1 block text-[11px] break-words">{a.serviceName}</span>
                      <span className="mt-1 block text-[11px]">{statusLabels[a.status]}</span>
                      {view === 'day' && (
                        <span className="mt-1 block text-muted">{a.dentistName}</span>
                      )}
                    </button>
                  ))}
                </div>
                {view === 'month' && bookings.length > 0 && (
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg bg-brand-50 text-xs font-medium text-brand-700 sm:hidden"
                    onClick={() => onDay(day)}
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
