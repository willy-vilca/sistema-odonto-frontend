import { useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import { Button } from '../../../shared/ui/Button'
import { QuickPatientEditor } from './QuickPatientEditor'

export function PatientSelection({
  selected,
  onChange,
  required = false,
  disabled = false,
}: {
  selected: PickedEntity[]
  onChange: (items: PickedEntity[]) => void
  required?: boolean
  disabled?: boolean
}) {
  const auth = useAuth(),
    [creating, setCreating] = useState(false)
  return (
    <div className="space-y-3">
      <EntityPicker
        label="Paciente"
        required={required}
        disabled={disabled}
        source={{ endpoint: '/api/v1/patients', labelKey: 'label', filters: { active: 'true' } }}
        selected={selected}
        onChange={onChange}
      />
      {auth.can('PATIENTS_WRITE') && (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => setCreating(true)}
        >
          + Registrar paciente
        </Button>
      )}
      {creating && (
        <QuickPatientEditor
          onClose={() => setCreating(false)}
          onSaved={(patient) => {
            onChange([{ id: patient.id, label: patient.label }])
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}
