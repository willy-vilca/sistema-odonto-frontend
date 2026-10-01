import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { useQueryData } from '../../../shared/data/useQueryData'
import type { Patient } from '../model/patient'
export function PatientPicker({
  patientId,
  onChange,
}: {
  patientId: string
  onChange: (items: PickedEntity[]) => void
}) {
  return patientId ? (
    <LoadedPatientPicker patientId={patientId} onChange={onChange} />
  ) : (
    <EntityPicker
      label="Paciente"
      source={{ endpoint: '/api/v1/patients', labelKey: 'fullName' }}
      selected={[]}
      onChange={onChange}
    />
  )
}
function LoadedPatientPicker({
  patientId,
  onChange,
}: {
  patientId: string
  onChange: (items: PickedEntity[]) => void
}) {
  const state = useQueryData<Patient>('/api/v1/patients/' + patientId)
  return (
    <div>
      {state.error && (
        <p role="alert" className="error-box">
          {state.error}
        </p>
      )}
      <EntityPicker
        label="Paciente"
        source={{ endpoint: '/api/v1/patients', labelKey: 'fullName' }}
        selected={[
          {
            id: patientId,
            label: state.data
              ? state.data.code + ' · ' + state.data.fullName
              : 'Paciente seleccionado',
          },
        ]}
        onChange={onChange}
      />
    </div>
  )
}
