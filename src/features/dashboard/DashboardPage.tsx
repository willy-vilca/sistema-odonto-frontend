import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  MessageCircle,
  CircleAlert,
  RefreshCw,
  ArrowUpRight,
  UsersRound,
} from 'lucide-react'
import type { InstallationState } from '../installation/model/installation'
import { ConnectionCard } from '../installation/components/ConnectionCard'
import { useAuth } from '../auth/hooks/useAuth'
import { useQueryData } from '../../shared/data/useQueryData'
import { Button } from '../../shared/ui/Button'
import { EntityPicker, type PickedEntity } from '../../shared/ui/EntityPicker'
import { clinicToday, formatLocalDate } from '../../shared/data/dateFormat'
import { PeriodFilter } from '../reports/components/PeriodFilter'
import { ReportTotals } from '../reports/components/ReportTotals'
import type { Period } from '../reports/model/reports'
import type { Dashboard } from './model/dashboard'
import { MetricCard } from './components/MetricCard'
import { DailyAppointments } from './components/DailyAppointments'
import { FinancialOverview } from './components/FinancialOverview'

export function DashboardPage({ state, reload }: { state: InstallationState; reload: () => void }) {
  return state.status === 'ready' ? (
    <DashboardWorkspace timeZone={state.data.timeZone} dateFormat={state.data.dateFormat} />
  ) : (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Panel del consultorio</h1>
      <ConnectionCard state={state} reload={reload} />
    </div>
  )
}
function DashboardWorkspace({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const auth = useAuth()
  const today = clinicToday(timeZone)
  const [day, setDay] = useState(today)
  const [period, setPeriod] = useState<Period>({ from: today.slice(0, 7) + '-01', to: today })
  const [dentist, setDentist] = useState<PickedEntity[]>([])
  const [revision, setRevision] = useState(0)
  const query = new URLSearchParams({
    ...period,
    day,
    ...(dentist[0] ? { dentistId: dentist[0].id } : {}),
  })
  const data = useQueryData<Dashboard>('/api/v1/dashboard?' + query)
  function refresh() {
    data.reload()
    setRevision((value) => value + 1)
  }
  const greeting = auth.session?.user?.displayName.split(' ')[0]
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Tu consultorio · {formatLocalDate(today, dateFormat)}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel del consultorio</h1>
          <p className="mt-2 text-sm text-muted">
            Hola{greeting ? ', ' + greeting : ''}. Aquí tienes las citas y tareas que requieren
            atención.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {auth.can('APPOINTMENTS_READ') && (
            <Link
              to="/agenda"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white"
            >
              <CalendarDays size={17} aria-hidden="true" />
              Ver agenda
            </Link>
          )}
          <Button variant="secondary" disabled={data.loading} onClick={refresh}>
            <RefreshCw size={17} aria-hidden="true" />
            Actualizar panel
          </Button>
        </div>
      </header>
      {auth.can('APPOINTMENTS_READ') && (
        <section
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5"
          aria-label="Día y profesional del panel"
        >
          <label className="field-label max-w-52">
            Día de atención
            <input
              className="field"
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value) setDay(e.target.value)
              }}
            />
          </label>
          <Button variant="quiet" onClick={() => setDay(today)}>
            Hoy
          </Button>
          {auth.can('DENTISTS_READ') && (
            <div className="min-w-0 flex-1 basis-60">
              <EntityPicker
                label="Profesional de la agenda"
                source={{ endpoint: '/api/v1/dentists', labelKey: 'fullName' }}
                selected={dentist}
                onChange={setDentist}
              />
            </div>
          )}
        </section>
      )}
      {data.error && (
        <p role="alert" className="error-box">
          {data.error}
        </p>
      )}
      {data.loading && (
        <div
          role="status"
          className="rounded-2xl border border-line bg-white p-7 text-sm text-muted"
        >
          Actualizando el panel…
        </div>
      )}
      {data.data && !data.loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.data.appointments && (
              <>
                <MetricCard
                  label="Citas del día"
                  value={data.data.appointments.total}
                  detail={`${data.data.appointments.attended} atendidas · ${data.data.appointments.cancelled} canceladas`}
                  icon={CalendarDays}
                />
                <MetricCard
                  label="En espera"
                  value={data.data.appointments.waiting}
                  detail={`${data.data.appointments.inProgress} en atención · ${data.data.appointments.noShow} inasistencias`}
                  icon={Clock3}
                  tone={data.data.appointments.waiting ? 'amber' : 'brand'}
                />
              </>
            )}
            {data.data.conversations && (
              <MetricCard
                label="Pendientes de recepción"
                value={data.data.conversations.pending}
                detail={`${data.data.conversations.human} conversaciones en atención manual`}
                icon={MessageCircle}
                to="/conversaciones?mode=HANDOFF"
                tone={data.data.conversations.pending ? 'amber' : 'brand'}
              />
            )}
            {data.data.overdue && (
              <MetricCard
                label="Cuotas vencidas"
                value={data.data.overdue.find((m) => m.key === 'records')?.value || '0'}
                detail={
                  'Vencimientos pendientes al ' + formatLocalDate(data.data.today, dateFormat)
                }
                icon={CircleAlert}
                tone="amber"
                to={
                  auth.can('REPORTS_READ')
                    ? `/reportes?type=INSTALLMENTS&status=OVERDUE&includeEarlier=true&from=${data.data.today.slice(0, 4)}-01-01&to=${data.data.today}`
                    : '/finanzas'
                }
              />
            )}
          </div>
          {data.data.overdue &&
            Number(data.data.overdue.find((m) => m.key === 'records')?.value || '0') > 0 && (
              <section className="space-y-3" aria-label="Importes de cuotas vencidas">
                <ReportTotals metrics={data.data.overdue.filter((m) => m.key === 'pending')} />
              </section>
            )}
        </>
      )}
      <nav aria-label="Accesos habituales" className="flex flex-wrap gap-2">
        {auth.can('PATIENTS_READ') && (
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-brand-50"
            to="/pacientes"
          >
            <UsersRound size={17} aria-hidden="true" />
            Pacientes
          </Link>
        )}
        {auth.can('FINANCES_READ') && (
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-brand-50"
            to="/finanzas"
          >
            Cobros y cuentas <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
        {auth.can('REPORTS_READ') && (
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-brand-50"
            to="/reportes"
          >
            Reportes <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
        {auth.can('SETTINGS_READ') && (
          <Link
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm text-muted hover:bg-brand-50"
            to="/configuracion"
          >
            Mi consultorio
          </Link>
        )}
      </nav>
      {data.data?.appointments && (
        <DailyAppointments
          day={day}
          dentistId={dentist[0]?.id || ''}
          dateFormat={dateFormat}
          timeZone={timeZone}
          revision={revision}
          onChanged={refresh}
        />
      )}
      {auth.can('FINANCES_READ') && (
        <>
          <section className="space-y-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Período financiero</h2>
            <PeriodFilter value={period} today={today} onChange={setPeriod} />
          </section>
          {data.data && !data.loading && (
            <FinancialOverview data={data.data} dateFormat={dateFormat} />
          )}
        </>
      )}
      {data.data && (
        <p className="text-xs text-muted">
          Última actualización:{' '}
          {new Intl.DateTimeFormat('es-PE', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(data.data.updatedAt))}{' '}
          · Las cifras respetan las áreas autorizadas para tu usuario.
        </p>
      )}
    </div>
  )
}
