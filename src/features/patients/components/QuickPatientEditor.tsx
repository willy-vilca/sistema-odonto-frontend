import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { createQuickPatient } from '../services/patientService'
import { normalizePhone, type Patient } from '../model/patient'

export function QuickPatientEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (patient: Patient) => void
}) {
  const [name, setName] = useState(''),
    [phone, setPhone] = useState('')
  const form = useSaveForm()
  function phoneValue() {
    const value = normalizePhone(phone)
    return /^[0-9]{9}$/.test(value) ? '+51' + value : value
  }
  return createPortal(
    <Modal title="Registrar paciente" onClose={onClose} busy={form.busy}>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.submit(() => createQuickPatient(name, phoneValue()), onSaved)
        }}
      >
        <p className="text-sm text-muted">
          Con estos datos puedes atender, agendar y cobrar. Puedes completar la ficha cuando lo
          necesites.
        </p>
        <FormField
          label="Nombre completo"
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
        <FormField
          label="Teléfono"
          type="tel"
          required
          maxLength={24}
          value={phone}
          placeholder="987654321 o +51987654321"
          autoComplete="tel"
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className="text-xs text-muted">
          Un número peruano de 9 dígitos se guarda con +51. Para otro país, incluye su código. El
          teléfono quedará como contacto del paciente y responsable de pago.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.busy}>Guardar y seleccionar</Button>
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Volver
          </Button>
        </div>
      </form>
    </Modal>,
    document.body,
  )
}
