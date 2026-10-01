import { clinicToday } from '../../../shared/data/dateFormat'
import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { FormField, TextAreaField } from '../../../shared/ui/FormField'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { emptyPatient, normalizePhone, type Patient, type PatientDraft } from '../model/patient'
import { savePatient } from '../services/patientService'
export function PatientEditor({
  patient,
  onClose,
  onSaved,
  timeZone,
}: {
  patient?: Patient
  onClose: () => void
  onSaved: () => void
  timeZone: string
}) {
  const [draft, setDraft] = useState<PatientDraft>(
    patient ? { ...patient, contacts: patient.contacts.map((c) => ({ ...c })) } : emptyPatient(),
  )
  const form = useSaveForm()
  const [today] = useState(() => clinicToday(timeZone))
  function change<K extends keyof PatientDraft>(key: K, value: PatientDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }
  const text = (
    key: 'fullName' | 'address' | 'email' | 'documentNumber' | 'emergencyName' | 'emergencyPhone',
    label: string,
    max: number,
    type = 'text',
  ) => (
    <FormField
      label={label}
      type={type}
      value={String(draft[key])}
      maxLength={max}
      required={key === 'fullName'}
      onChange={(e) =>
        change(key, key === 'emergencyPhone' ? normalizePhone(e.target.value) : e.target.value)
      }
    />
  )
  return (
    <Modal
      title={patient ? 'Editar paciente · ' + patient.code : 'Nuevo paciente'}
      onClose={onClose}
      busy={form.busy}
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          void form.submit(() => savePatient(draft, patient?.id), onSaved)
        }}
      >
        <p className="text-sm text-muted">
          Una ficha por persona. Los integrantes de una familia pueden compartir el mismo teléfono.
        </p>
        <fieldset disabled={form.busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {text('fullName', 'Nombre completo', 160)}
            <FormField
              label="Fecha de nacimiento"
              type="date"
              required={!draft.provisional}
              max={today}
              value={draft.birthDate ?? ''}
              onChange={(e) => change('birthDate', e.target.value || null)}
            />
            <label className="field-label">
              Tipo de documento
              <select
                className="field"
                value={draft.documentType}
                onChange={(e) => change('documentType', e.target.value)}
              >
                {[
                  ['', 'Sin documento'],
                  ['DNI', 'DNI'],
                  ['CE', 'Carné de extranjería'],
                  ['PASSPORT', 'Pasaporte'],
                  ['OTHER', 'Otro'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {text('documentNumber', 'Número de documento', 40)}
            {text('email', 'Correo electrónico', 160, 'email')}
            {text('address', 'Dirección', 250)}
          </div>
          <div className="flex flex-wrap gap-5 rounded-xl bg-canvas p-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.provisional}
                onChange={(e) => change('provisional', e.target.checked)}
              />
              Ficha provisional
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => change('active', e.target.checked)}
              />
              Paciente activo
            </label>
            <p className="w-full text-xs text-muted">
              La ficha provisional permite reservar con datos básicos y completar la fecha de
              nacimiento después.
            </p>
          </div>
          <section className="space-y-4">
            <div>
              <h2 className="font-semibold">Contactos y responsables</h2>
              <p className="mt-1 text-xs text-muted">
                Usa el código del país, por ejemplo +51987654321. Para un menor, identifica a su
                responsable.
              </p>
            </div>
            {draft.contacts.map((contact, index) => (
              <fieldset key={index} className="space-y-3 rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-medium">Contacto {index + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['name', 'phone', 'relationship'] as const).map((key) => (
                    <FormField
                      key={key}
                      label={
                        {
                          name: 'Nombre del contacto',
                          phone: 'Teléfono',
                          relationship: 'Relación con el paciente',
                        }[key]
                      }
                      type={key === 'phone' ? 'tel' : 'text'}
                      required
                      maxLength={key === 'phone' ? 20 : key === 'name' ? 160 : 80}
                      pattern={key === 'phone' ? '[+][1-9][0-9]{7,14}' : undefined}
                      value={contact[key]}
                      onChange={(e) => {
                        const contacts = draft.contacts.map((c) => ({ ...c }))
                        contacts[index][key] =
                          key === 'phone' ? normalizePhone(e.target.value) : e.target.value
                        change('contacts', contacts)
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {(['guardian', 'payer'] as const).map((key) => (
                    <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={contact[key]}
                        onChange={(e) => {
                          const contacts = draft.contacts.map((c) => ({ ...c }))
                          contacts[index][key] = e.target.checked
                          change('contacts', contacts)
                        }}
                      />
                      {key === 'guardian' ? 'Responsable del menor' : 'Responsable de pago'}
                    </label>
                  ))}
                  {draft.contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() =>
                        change(
                          'contacts',
                          draft.contacts.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Quitar contacto
                    </Button>
                  )}
                </div>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={draft.contacts.length >= 8}
              onClick={() =>
                change('contacts', [
                  ...draft.contacts,
                  { name: '', phone: '', relationship: '', guardian: false, payer: false },
                ])
              }
            >
              Añadir contacto
            </Button>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('emergencyName', 'Contacto de emergencia', 160)}
            {text('emergencyPhone', 'Teléfono de emergencia', 20, 'tel')}
          </div>
          <TextAreaField
            label="Notas administrativas"
            maxLength={2000}
            value={draft.notes}
            onChange={(e) => change('notes', e.target.value)}
          />
        </fieldset>
        {form.error && (
          <p className="error-box" role="alert">
            {form.error}
          </p>
        )}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="secondary" disabled={form.busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={form.busy}>{form.busy ? 'Guardando…' : 'Guardar paciente'}</Button>
        </footer>
      </form>
    </Modal>
  )
}
