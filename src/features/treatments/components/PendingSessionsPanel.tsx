import { Link } from 'react-router-dom'
import { useState } from 'react'
import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { formatLocalDate, clinicToday } from '../../../shared/data/dateFormat'
import { dateAdd } from '../../appointments/model/calendar'
import type { ScheduledSession } from '../model/treatments'
import { useQueryData } from '../../../shared/data/useQueryData'

export function PendingSessionsPanel({
  patientId,
  dentistId,
  planId,
  from,
  to,
  revision = 0,
  timeZone = 'America/Lima',
  dateFormat = 'DMY',
  dashboard = false,
  onOpen,
}: {
  patientId?: string
  dentistId?: string
  planId?: string
  from?: string
  to?: string
  revision?: number
  timeZone?: string
  dateFormat?: string
  dashboard?: boolean
  onOpen?: (session: ScheduledSession) => void
}) {
  const today = clinicToday(timeZone),
    [period, setPeriod] = useState('upcoming')
  const summary = useQueryData<{ upcoming: number; overdue: number; undated: number }>(
    dashboard
      ? '/api/v1/treatment-sessions/coordination-summary' +
          (dentistId ? '?dentistId=' + dentistId : '')
      : '',
  )
  const filters = {
    status: 'PENDING',
    ...(patientId ? { patientId } : {}),
    ...(dentistId ? { dentistId } : {}),
    ...(planId ? { planId } : {}),
    ...(dashboard
      ? period === 'upcoming'
        ? { from: today, to: dateAdd(today, 7) }
        : period === 'overdue'
          ? { to: dateAdd(today, -1) }
          : period === 'undated'
            ? { undated: 'true' }
            : {}
      : { ...(from ? { from } : {}), ...(to ? { to } : {}) }),
  }
  const list = usePagedList<ScheduledSession>(
    '/api/v1/treatment-sessions',
    filters,
    'plannedOn',
    revision,
  )
  return (
    <section aria-label="Sesiones pendientes de horario" className="space-y-3">
      <header>
        <h2 className="font-semibold">
          {dashboard ? 'Sesiones por coordinar' : 'Pendientes de horario'}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Revisa la fecha y contacta al paciente para acordar una hora. Estas sesiones todavía no
          ocupan horario.
        </p>
      </header>
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"
            onClick={() => setPeriod('overdue')}
          >
            <strong className="text-lg text-amber-900">{summary.data.overdue}</strong>
            <p className="mt-1 text-sm">Fechas vencidas por coordinar</p>
          </button>
          <button
            className="rounded-xl border border-line bg-brand-50 p-4 text-left"
            onClick={() => setPeriod('upcoming')}
          >
            <strong className="text-lg">{summary.data.upcoming}</strong>
            <p className="mt-1 text-sm">Próximos 7 días · Hora pendiente</p>
          </button>
          <button
            className="rounded-xl border border-line bg-canvas p-4 text-left"
            onClick={() => setPeriod('undated')}
          >
            <strong className="text-lg">{summary.data.undated}</strong>
            <p className="mt-1 text-sm">Sesiones sin fecha asignada</p>
          </button>
        </div>
      )}
      <PagedTable
        searchLabel="Buscar sesiones pendientes"
        list={list}
        keyFor={(s) => s.id}
        filters={
          dashboard ? (
            <label className="field-label">
              Avisos de coordinación
              <select className="field" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="upcoming">Próximos 7 días</option>
                <option value="overdue">Fecha vencida por coordinar</option>
                <option value="undated">Sin fecha asignada</option>
                <option value="all">Todas las pendientes</option>
              </select>
            </label>
          ) : undefined
        }
        columns={[
          {
            label: 'Paciente y tratamiento',
            render: (s) => (
              <>
                <p className="font-medium">{s.patientName}</p>
                <p className="mt-1 text-sm">{s.description}</p>
                <p className="text-xs text-muted">
                  {s.planCode} · Sesión {s.sessionNumber} de {s.totalSessions}
                </p>
              </>
            ),
          },
          {
            label: 'Fecha prevista',
            render: (s) => (
              <>
                <p>
                  {s.plannedOn ? formatLocalDate(s.plannedOn, dateFormat) : 'Fecha por coordinar'}
                </p>
                <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  {s.plannedOn && s.plannedOn < today
                    ? 'Fecha vencida · Hora pendiente'
                    : 'Hora pendiente'}
                </span>
              </>
            ),
          },
          {
            label: 'Profesional',
            render: (s) => (
              <>
                <p>{s.dentistName}</p>
                <p className="text-xs text-muted">{s.durationMinutes} minutos previstos</p>
              </>
            ),
          },
          {
            label: 'Acciones',
            render: (s) =>
              onOpen ? (
                <Button variant="quiet" onClick={() => onOpen(s)}>
                  Coordinar sesión
                </Button>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-brand-700"
                  to={'/agenda?session=' + s.id + '&patientId=' + s.patientId}
                >
                  Coordinar sesión
                </Link>
              ),
          },
        ]}
      />
    </section>
  )
}
