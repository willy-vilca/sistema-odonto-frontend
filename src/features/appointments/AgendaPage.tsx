import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { Button } from '../../shared/ui/Button'
import { EntityPicker, type PickedEntity } from '../../shared/ui/EntityPicker'
import { FormField } from '../../shared/ui/FormField'
import { useQueryData } from '../../shared/data/useQueryData'
import { AppointmentEditor } from './components/AppointmentEditor'
import { AppointmentDetail } from './components/AppointmentDetail'
import { AppointmentById } from './components/AppointmentById'
import { AppointmentCalendar } from './components/AppointmentCalendar'
import { AppointmentList } from './components/AppointmentList'
import { DayAppointmentsDialog } from './components/DayAppointmentsDialog'
import { clinicToday, dateRange, dateAdd, monthAdd, type CalendarView } from './model/calendar'
import { statusLabels, type CalendarResponse, type Appointment } from './model/appointment'
import { formatLocalDate } from '../../shared/data/dateFormat'
export function AgendaPage({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const linkedAppointment = params.get('appointment')
  const [view, setView] = useState<CalendarView>(() =>
    window.matchMedia('(max-width:767px)').matches ? 'list' : 'week',
  )
  const [date, setDate] = useState(() => clinicToday(timeZone))
  const [dentist, setDentist] = useState<PickedEntity[]>([])
  const [status, setStatus] = useState('')
  const [listFrom, setListFrom] = useState('')
  const [listTo, setListTo] = useState('')
  const [editor, setEditor] = useState(false)
  const [selected, setSelected] = useState<Appointment>()
  const [revision, setRevision] = useState(0)
  const [expandedDay, setExpandedDay] = useState<string>()
  if (!auth.can('APPOINTMENTS_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar la agenda.
      </p>
    )
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Consultorio · Agenda</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agenda de citas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Cada atención tiene su tiempo. Organiza las reservas, confirma la asistencia y conserva
            cada cambio.
          </p>
        </div>
        {auth.can('APPOINTMENTS_WRITE') && (
          <Button onClick={() => setEditor(true)}>
            <Plus size={17} aria-hidden="true" />
            Nueva cita
          </Button>
        )}
      </header>
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 rounded-xl bg-canvas p-1">
            {(
              [
                ['day', 'Día'],
                ['week', 'Semana'],
                ['month', 'Mes'],
                ['list', 'Lista'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={view === key ? 'primary' : 'quiet'}
                animate={false}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-muted">
            <CalendarDays size={15} aria-hidden="true" />
            {timeZone}
          </p>
        </div>
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <EntityPicker
            label="Odontólogo"
            source={{ endpoint: '/api/v1/dentists', labelKey: 'fullName' }}
            selected={dentist}
            onChange={setDentist}
          />
          {view === 'list' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Desde"
                type="date"
                value={listFrom}
                onChange={(e) => setListFrom(e.target.value)}
              />
              <FormField
                label="Hasta"
                type="date"
                value={listTo}
                onChange={(e) => setListTo(e.target.value)}
              />
              <label className="field-label sm:col-span-2">
                Estado
                <select
                  className="field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <FormField
                label="Fecha de referencia"
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value)
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  aria-label="Periodo anterior"
                  onClick={() =>
                    setDate(
                      view === 'month'
                        ? monthAdd(date, -1)
                        : dateAdd(date, view === 'week' ? -7 : -1),
                    )
                  }
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </Button>
                <Button variant="secondary" onClick={() => setDate(clinicToday(timeZone))}>
                  Hoy
                </Button>
                <Button
                  variant="secondary"
                  aria-label="Periodo siguiente"
                  onClick={() =>
                    setDate(
                      view === 'month' ? monthAdd(date, 1) : dateAdd(date, view === 'week' ? 7 : 1),
                    )
                  }
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
        {!dentist.length && (
          <p className="mt-3 text-xs text-muted">
            Mostrando todos los odontólogos. Puedes seleccionar uno para enfocar su agenda.
          </p>
        )}
      </div>
      {view === 'list' ? (
        <AppointmentList
          key={revision}
          filters={{
            ...(dentist.length ? { dentistId: dentist[0].id } : {}),
            ...(status ? { status } : {}),
            ...(listFrom ? { from: listFrom } : {}),
            ...(listTo ? { to: listTo } : {}),
          }}
          onOpen={setSelected}
          dateFormat={dateFormat}
        />
      ) : (
        <CalendarSection
          key={revision}
          date={date}
          view={view}
          dentistId={dentist[0]?.id}
          dateFormat={dateFormat}
          onDay={(day) => {
            setDate(day)
            setView('day')
          }}
          onOpen={setSelected}
          onOpenDay={setExpandedDay}
        />
      )}
      <p className="text-xs text-muted">
        La agenda utiliza la duración guardada en cada cita. Los cambios del catálogo no modifican
        reservas existentes.
      </p>
      <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-700">
        Volver al inicio
      </Link>
      {editor && (
        <AppointmentEditor
          date={date}
          timeZone={timeZone}
          initialDentist={dentist}
          onClose={() => setEditor(false)}
          onSaved={() => {
            setEditor(false)
            setRevision((n) => n + 1)
          }}
        />
      )}
      {expandedDay && (
        <DayAppointmentsDialog
          key={expandedDay + '|' + (dentist[0]?.id ?? '')}
          date={expandedDay}
          dentistId={dentist[0]?.id}
          dentistName={dentist[0]?.label}
          dateFormat={dateFormat}
          revision={revision}
          onOpen={setSelected}
          onClose={() => setExpandedDay(undefined)}
        />
      )}
      {selected && (
        <AppointmentDetail
          appointment={selected}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onClose={() => setSelected(undefined)}
          onChanged={() => setRevision((n) => n + 1)}
        />
      )}
      {linkedAppointment && (
        <AppointmentById
          key={linkedAppointment}
          id={linkedAppointment}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onChanged={() => setRevision((n) => n + 1)}
          onClose={() => {
            const next = new URLSearchParams(params)
            next.delete('appointment')
            setParams(next, { replace: true })
          }}
        />
      )}
    </div>
  )
}
function CalendarSection({
  date,
  view,
  dentistId,
  dateFormat,
  onDay,
  onOpen,
  onOpenDay,
}: {
  date: string
  view: CalendarView
  dentistId?: string
  dateFormat: string
  onDay: (date: string) => void
  onOpen: (a: Appointment) => void
  onOpenDay: (date: string) => void
}) {
  const range = dateRange(date, view)
  const url =
    '/api/v1/appointments/calendar?' +
    new URLSearchParams({ ...range, ...(dentistId ? { dentistId } : {}) })
  const result = useQueryData<CalendarResponse>(url)
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {formatLocalDate(range.from, dateFormat)}
        {range.from !== range.to ? ' — ' + formatLocalDate(range.to, dateFormat) : ''}
      </p>
      {result.error ? (
        <div className="space-y-3">
          <p role="alert" className="error-box">
            {result.error}
          </p>
          <Button variant="secondary" onClick={result.reload}>
            Reintentar agenda
          </Button>
        </div>
      ) : result.loading ? (
        <p
          role="status"
          className="rounded-2xl border border-line bg-white p-10 text-sm text-muted"
        >
          Consultando citas…
        </p>
      ) : (
        <AppointmentCalendar
          items={result.data?.items ?? []}
          view={view}
          from={range.from}
          selectedDate={date}
          onDay={onDay}
          onOpen={onOpen}
          onOpenDay={onOpenDay}
        />
      )}
    </div>
  )
}
