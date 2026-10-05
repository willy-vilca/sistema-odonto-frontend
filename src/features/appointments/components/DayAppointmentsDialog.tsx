import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { AppointmentList } from './AppointmentList'
import { statusLabels, type Appointment } from '../model/appointment'

export function DayAppointmentsDialog({
  date,
  dentistId,
  dentistName,
  dateFormat,
  revision,
  onOpen,
  onClose,
}: {
  date: string
  dentistId?: string
  dentistName?: string
  dateFormat: string
  revision: number
  onOpen: (appointment: Appointment) => void
  onClose: () => void
}) {
  const [status, setStatus] = useState('')
  return (
    <Modal title={'Citas del ' + formatLocalDate(date, dateFormat)} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {dentistName ?? 'Todos los odontólogos'}. Abre una cita para consultar sus opciones e
          historial.
        </p>
        <label className="field-label">
          Estado de la cita
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <AppointmentList
          filters={{
            from: date,
            to: date,
            ...(dentistId ? { dentistId } : {}),
            ...(status ? { status } : {}),
          }}
          dateFormat={dateFormat}
          refreshKey={revision}
          onOpen={onOpen}
        />
        <Button type="button" variant="secondary" onClick={onClose}>
          Volver al calendario
        </Button>
      </div>
    </Modal>
  )
}
