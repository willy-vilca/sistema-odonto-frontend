import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

export function PatientNavigation({
  patientId,
  onNavigate,
}: {
  patientId: string
  onNavigate?: () => void
}) {
  const auth = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const links = [
    { label: 'Ficha', path: '/pacientes', query: '', permission: 'PATIENTS_READ' },
    { label: 'Clínica', path: '/clinica', query: '&tab=atenciones', permission: 'CLINICAL_READ' },
    { label: 'Archivos', path: '/clinica', query: '&tab=documentos', permission: 'DOCUMENTS_READ' },
    { label: 'Tratamientos', path: '/tratamientos', query: '', permission: 'PLANS_READ' },
    { label: 'Agenda', path: '/agenda', query: '', permission: 'APPOINTMENTS_READ' },
    { label: 'Cuenta', path: '/finanzas', query: '', permission: 'FINANCES_READ' },
  ]
  return (
    <nav
      aria-label="Áreas del paciente"
      className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1"
    >
      {links
        .filter((item) => auth.can(item.permission))
        .map((item) => {
          const active =
            location.pathname === item.path &&
            (item.path !== '/clinica' ||
              (item.label === 'Archivos'
                ? params.get('tab') === 'documentos'
                : params.get('tab') !== 'documentos'))
          return (
            <Link
              key={item.label}
              to={item.path + '?patientId=' + patientId + item.query}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={
                'inline-flex min-h-11 shrink-0 items-center rounded-lg px-4 text-sm font-medium ' +
                (active ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-canvas')
              }
            >
              {item.label}
            </Link>
          )
        })}
    </nav>
  )
}
