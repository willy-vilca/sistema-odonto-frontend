import { useState } from 'react'
import { AppointmentList } from '../../appointments/components/AppointmentList'
import { AppointmentDetail } from '../../appointments/components/AppointmentDetail'
import { statusLabels, type Appointment } from '../../appointments/model/appointment'
import { formatLocalDate } from '../../../shared/data/dateFormat'

export function DailyAppointments({
  day,
  dentistId,
  dateFormat,
  timeZone,
  revision,
  onChanged,
}: {
  day: string
  dentistId: string
  dateFormat: string
  timeZone: string
  revision: number
  onChanged: () => void
}) {
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Appointment>()
  return (
    <section aria-labelledby="daily-appointments" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="daily-appointments" className="text-xl font-semibold">
          Citas del {formatLocalDate(day, dateFormat)}
        </h2>
        <label className="field-label min-w-44">
          Estado de las citas
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <AppointmentList
        filters={{ from: day, to: day, dentistId, status }}
        dateFormat={dateFormat}
        refreshKey={revision}
        onOpen={setSelected}
      />
      {selected && (
        <AppointmentDetail
          appointment={selected}
          timeZone={timeZone}
          dateFormat={dateFormat}
          onClose={() => setSelected(undefined)}
          onChanged={onChanged}
        />
      )}
    </section>
  )
}
