import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { StatusBadge } from '../../../shared/ui/PagedTable'
import { formatLocalDate } from '../../../shared/data/dateFormat'
import { useAuth } from '../../auth/hooks/useAuth'
import { AppointmentList } from '../../appointments/components/AppointmentList'
import type { Appointment } from '../../appointments/model/appointment'
import type { Patient } from '../model/patient'
export function PatientDetail({
  patient,
  dateFormat,
  onClose,
  onEdit,
  onAppointment,
}: {
  patient: Patient
  dateFormat: string
  onClose: () => void
  onEdit: () => void
  onAppointment: (a: Appointment) => void
}) {
  const auth = useAuth()
  return (
    <Modal title="Ficha del paciente" onClose={onClose}>
      <div className="space-y-6">
        <div className="rounded-xl bg-brand-50 p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-brand-700">
                {patient.code}
                {patient.provisional ? ' · Provisional' : ''}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{patient.fullName}</h2>
            </div>
            <StatusBadge active={patient.active} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {patient.birthDate
              ? 'Nacimiento: ' + formatLocalDate(patient.birthDate, dateFormat)
              : 'Fecha de nacimiento pendiente'}
            {patient.documentNumber
              ? ' · ' + patient.documentType + ' ' + patient.documentNumber
              : ''}
          </p>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['Dirección', patient.address],
            ['Correo', patient.email],
            [
              'Emergencia',
              [patient.emergencyName, patient.emergencyPhone].filter(Boolean).join(' · '),
            ],
            ['Notas administrativas', patient.notes],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-1 break-words whitespace-pre-wrap">{value || 'Sin registrar'}</dd>
            </div>
          ))}
        </dl>
        <section className="space-y-3">
          <h2 className="font-semibold">Contactos</h2>
          {patient.contacts.map((c) => (
            <article key={c.phone} className="rounded-xl border border-line p-4">
              <p className="font-medium">{c.name}</p>
              <p className="mt-1 text-sm text-muted">
                {c.phone} · {c.relationship}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {c.guardian && <span className="status-active">Responsable del menor</span>}
                {c.payer && <span className="status-inactive">Responsable de pago</span>}
              </div>
            </article>
          ))}
        </section>
        {auth.can('PATIENTS_WRITE') && (
          <Button variant="secondary" onClick={onEdit}>
            Editar ficha
          </Button>
        )}
        {auth.can('APPOINTMENTS_READ') && (
          <section className="space-y-3">
            <h2 className="font-semibold">Citas del paciente</h2>
            <AppointmentList
              filters={{ patientId: patient.id, direction: 'desc' }}
              dateFormat={dateFormat}
              onOpen={onAppointment}
            />
          </section>
        )}
      </div>
    </Modal>
  )
}
