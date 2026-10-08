import { useQueryData } from '../../../shared/data/useQueryData'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import type { Appointment } from '../model/appointment'
import { AppointmentDetail } from './AppointmentDetail'

export function AppointmentById({
  id,
  timeZone,
  dateFormat,
  onClose,
  onChanged,
}: {
  id: string
  timeZone: string
  dateFormat: string
  onClose: () => void
  onChanged: () => void
}) {
  const result = useQueryData<Appointment>('/api/v1/appointments/' + encodeURIComponent(id))
  if (result.data)
    return (
      <AppointmentDetail
        appointment={result.data}
        timeZone={timeZone}
        dateFormat={dateFormat}
        onClose={onClose}
        onChanged={onChanged}
      />
    )
  return (
    <Modal title="Detalle de la cita" onClose={onClose}>
      {result.error ? (
        <div className="space-y-3">
          <p role="alert" className="error-box">
            {result.error}
          </p>
          <Button variant="secondary" onClick={result.reload}>
            Reintentar consulta
          </Button>
        </div>
      ) : (
        <p role="status">Consultando cita vinculada…</p>
      )}
    </Modal>
  )
}
