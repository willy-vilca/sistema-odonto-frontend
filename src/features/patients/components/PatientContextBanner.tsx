import { useQueryData } from '../../../shared/data/useQueryData'
import { PatientNavigation } from './PatientNavigation'
import type { Patient } from '../model/patient'

export function PatientContextBanner({ id }: { id: string }) {
  const patient = useQueryData<Patient>('/api/v1/patients/' + id)
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-brand-50 p-4 sm:p-5">
      {patient.error ? (
        <p role="alert" className="error-box">
          {patient.error}
        </p>
      ) : (
        <div>
          <p className="text-xs text-brand-700">{patient.data?.code || 'Paciente'}</p>
          <h2 className="mt-1 text-xl font-semibold">
            {patient.data?.fullName || 'Consultando ficha…'}
          </h2>
        </div>
      )}
      <PatientNavigation patientId={id} />
    </section>
  )
}
