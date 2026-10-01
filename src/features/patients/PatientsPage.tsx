import { useState } from 'react'
import { Plus, UsersRound } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { usePagedList } from '../../shared/data/usePagedList'
import { PagedTable, StatusBadge } from '../../shared/ui/PagedTable'
import { Button } from '../../shared/ui/Button'
import { formatLocalDate } from '../../shared/data/dateFormat'
import { PatientEditor } from './components/PatientEditor'
import { PatientDetail } from './components/PatientDetail'
import { AppointmentDetail } from '../appointments/components/AppointmentDetail'
import type { Appointment } from '../appointments/model/appointment'
import type { Patient } from './model/patient'
export function PatientsPage({ dateFormat, timeZone }: { dateFormat: string; timeZone: string }) {
  const auth = useAuth()
  const [active, setActive] = useState('')
  const [provisional, setProvisional] = useState('')
  const list = usePagedList<Patient>('/api/v1/patients', {
    ...(active ? { active } : {}),
    ...(provisional ? { provisional } : {}),
  })
  const [editor, setEditor] = useState<{ patient?: Patient } | null>(null)
  const [selected, setSelected] = useState<Patient>()
  const [appointment, setAppointment] = useState<Appointment>()
  if (!auth.can('PATIENTS_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar pacientes.
      </p>
    )
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Consultorio · Pacientes</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Una ficha clara para cada persona, con sus contactos, responsables y citas.
          </p>
        </div>
        {auth.can('PATIENTS_WRITE') && (
          <Button onClick={() => setEditor({})}>
            <Plus size={17} aria-hidden="true" />
            Nuevo paciente
          </Button>
        )}
      </header>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-brand-50 px-5 py-4">
        <UsersRound className="shrink-0 text-brand-700" size={24} aria-hidden="true" />
        <p className="text-sm text-muted">
          Busca por nombre, código, documento o teléfono. Un número compartido puede encontrar a
          varios integrantes de la familia.
        </p>
      </div>
      <PagedTable
        list={list}
        keyFor={(p) => p.id}
        filters={
          <>
            <label className="field-label">
              Estado
              <select className="field" value={active} onChange={(e) => setActive(e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </label>
            <label className="field-label">
              Tipo de ficha
              <select
                className="field"
                value={provisional}
                onChange={(e) => setProvisional(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="false">Completas</option>
                <option value="true">Provisionales</option>
              </select>
            </label>
          </>
        }
        columns={[
          {
            label: 'Paciente',
            render: (p) => (
              <>
                <p className="font-semibold">{p.fullName}</p>
                <p className="mt-1 text-xs text-muted">
                  {p.code}
                  {p.provisional ? ' · Provisional' : ''}
                </p>
              </>
            ),
          },
          {
            label: 'Documento y nacimiento',
            render: (p) => (
              <>
                <p>
                  {p.documentNumber ? p.documentType + ' ' + p.documentNumber : 'Sin documento'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {p.birthDate ? formatLocalDate(p.birthDate, dateFormat) : 'Nacimiento pendiente'}
                </p>
              </>
            ),
          },
          {
            label: 'Contacto',
            render: (p) => (
              <>
                <p>{p.contacts[0]?.phone}</p>
                <p className="mt-1 text-xs text-muted">{p.contacts[0]?.name}</p>
              </>
            ),
          },
          { label: 'Estado', render: (p) => <StatusBadge active={p.active} /> },
        ]}
        actions={(p) => (
          <Button variant="quiet" onClick={() => setSelected(p)}>
            Ver ficha
          </Button>
        )}
      />
      {editor && (
        <PatientEditor
          timeZone={timeZone}
          patient={editor.patient}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            list.reload()
          }}
        />
      )}
      {selected && (
        <PatientDetail
          patient={selected}
          dateFormat={dateFormat}
          onClose={() => setSelected(undefined)}
          onEdit={() => {
            setEditor({ patient: selected })
            setSelected(undefined)
          }}
          onAppointment={(a) => {
            setSelected(undefined)
            setAppointment(a)
          }}
        />
      )}
      {appointment && (
        <AppointmentDetail
          appointment={appointment}
          dateFormat={dateFormat}
          timeZone={timeZone}
          onClose={() => setAppointment(undefined)}
          onChanged={list.reload}
        />
      )}
    </div>
  )
}
