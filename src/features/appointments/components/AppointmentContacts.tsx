import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { useQueryData } from '../../../shared/data/useQueryData'
interface Contact {
  phone: string
  name: string
  relationship: string
  guardian: boolean
  payer: boolean
}
export function AppointmentContacts({
  appointmentId,
  patientId,
}: {
  appointmentId?: string
  patientId: string
}) {
  const auth = useAuth()
  const result = useQueryData<{ contacts: Contact[] }>(
    auth.can('PATIENTS_READ')
      ? appointmentId
        ? `/api/v1/appointments/${appointmentId}/contacts`
        : `/api/v1/patients/${patientId}`
      : '',
  )
  if (!auth.can('PATIENTS_READ')) return null
  return (
    <section
      className="space-y-3 rounded-xl border border-line p-4"
      aria-label="Contacto del paciente"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Contacto del paciente</h3>
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
          to={'/pacientes?patientId=' + patientId}
        >
          Ver ficha
        </Link>
      </div>
      {result.loading ? (
        <p role="status" className="text-sm">
          Consultando contacto…
        </p>
      ) : result.error ? (
        <p role="alert" className="error-box">
          {result.error}
        </p>
      ) : result.data?.contacts.length ? (
        result.data.contacts.map((c, i) => (
          <div
            key={c.phone + '-' + i}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-canvas p-3"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted">
                {c.relationship}
                {c.guardian ? ' · Responsable' : ''}
                {c.payer ? ' · Responsable de pago' : ''}
              </p>
              <p className="mt-1 text-sm">{c.phone}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand-700">
              <a className="inline-flex min-h-11 items-center" href={'tel:' + c.phone}>
                Llamar
              </a>
              {auth.can('WHATSAPP_READ') && (
                <Link
                  className="inline-flex min-h-11 items-center"
                  to={'/conversaciones?phone=' + encodeURIComponent(c.phone)}
                >
                  Ver conversación
                </Link>
              )}
              <a
                className="inline-flex min-h-11 items-center"
                href={'https://wa.me/' + c.phone.replace(/\D/g, '')}
                target="_blank"
                rel="noreferrer"
              >
                Abrir WhatsApp
              </a>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted">
          Sin teléfono registrado. Puedes añadirlo en la ficha del paciente.
        </p>
      )}
    </section>
  )
}
