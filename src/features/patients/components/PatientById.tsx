import { useQueryData } from '../../../shared/data/useQueryData'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { PatientDetail } from './PatientDetail'
import type { Patient } from '../model/patient'
import type { Appointment } from '../../appointments/model/appointment'

export function PatientById({
  id,
  dateFormat,
  onClose,
  onEdit,
  onAppointment,
}: {
  id: string
  dateFormat: string
  onClose: () => void
  onEdit: (patient: Patient) => void
  onAppointment: (a: Appointment) => void
}) {
  const patient = useQueryData<Patient>('/api/v1/patients/' + id)
  if (patient.data)
    return (
      <PatientDetail
        patient={patient.data}
        dateFormat={dateFormat}
        onClose={onClose}
        onEdit={() => onEdit(patient.data!)}
        onAppointment={onAppointment}
      />
    )
  return (
    <Modal title="Ficha del paciente" onClose={onClose}>
      {patient.error ? (
        <div className="space-y-3">
          <p role="alert" className="error-box">
            {patient.error}
          </p>
          <Button onClick={patient.reload}>Reintentar</Button>
        </div>
      ) : (
        <p role="status">Cargando ficha…</p>
      )}
    </Modal>
  )
}
