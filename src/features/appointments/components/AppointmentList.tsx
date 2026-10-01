import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { localTime, statusLabels, type Appointment } from '../model/appointment'
export function AppointmentBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === 'CANCELLED' || status === 'NO_SHOW' ? 'status-inactive' : 'status-active'
      }
    >
      {statusLabels[status]}
    </span>
  )
}
export function AppointmentList({
  filters,
  onOpen,
  dateFormat = 'DMY',
}: {
  filters: Record<string, string>
  onOpen: (a: Appointment) => void
  dateFormat?: string
}) {
  const list = usePagedList<Appointment>('/api/v1/appointments', filters, 'startsAt')
  return (
    <PagedTable
      list={list}
      keyFor={(a) => a.id}
      columns={[
        {
          label: 'Fecha y hora',
          render: (a) => (
            <>
              <p className="font-medium">
                {formatLocalDate(a.localStart.slice(0, 10), dateFormat)}
              </p>
              <p className="mt-1 text-muted">
                {localTime(a.localStart)}–{localTime(a.localEnd)}
              </p>
            </>
          ),
        },
        {
          label: 'Paciente',
          render: (a) => (
            <>
              <p className="font-medium">{a.patientName}</p>
              <p className="text-xs text-muted">{a.patientCode}</p>
            </>
          ),
        },
        {
          label: 'Atención',
          render: (a) => (
            <>
              <p>{a.serviceName}</p>
              <p className="text-xs text-muted">
                {a.dentistName} · {a.durationMinutes} min
              </p>
            </>
          ),
        },
        { label: 'Estado', render: (a) => <AppointmentBadge status={a.status} /> },
      ]}
      actions={(a) => (
        <Button variant="quiet" onClick={() => onOpen(a)}>
          Ver cita
        </Button>
      )}
    />
  )
}
