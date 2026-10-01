import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardPlus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { EntityPicker, type PickedEntity } from '../../shared/ui/EntityPicker'
import { useQueryData } from '../../shared/data/useQueryData'
import { BackgroundPanel } from './components/BackgroundPanel'
import { EncountersPanel } from './components/EncountersPanel'
import { OdontogramPanel } from './components/OdontogramPanel'
import { DocumentsPanel } from '../documents/components/DocumentsPanel'
import { ConsentsPanel } from '../documents/components/ConsentsPanel'
import type { Patient } from '../patients/model/patient'
export function ClinicalPage({ dateFormat, timeZone }: { dateFormat: string; timeZone: string }) {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    [selected, setSelected] = useState<PickedEntity[]>([]),
    [tab, setTab] = useState('atenciones')
  const linked = params.get('patientId')
  if (!auth.can('CLINICAL_READ') && !auth.can('DOCUMENTS_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar el expediente clínico.
      </p>
    )
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Consultorio · Atención y evolución</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Historia clínica</h1>
        <p className="mt-2 text-sm text-muted">
          Atenciones, odontograma y documentos que conservan la historia del paciente.
        </p>
      </header>
      {!selected[0] && !linked && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <EntityPicker
            label="Paciente"
            source={{ endpoint: '/api/v1/patients', labelKey: 'label' }}
            selected={selected}
            onChange={(items) => {
              setSelected(items)
              setParams({})
            }}
          />
        </section>
      )}
      {selected[0] || linked ? (
        <ClinicalWorkspace
          key={selected[0]?.id ?? linked}
          encounterId={params.get('encounterId') ?? undefined}
          patientId={selected[0]?.id ?? linked!}
          onPatientChange={(items) => {
            setSelected(items)
            setParams({})
          }}
          tab={tab}
          setTab={setTab}
          dateFormat={dateFormat}
          timeZone={timeZone}
        />
      ) : (
        <section className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <ClipboardPlus className="mx-auto text-brand-700" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">Cada atención forma parte de una historia</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
            Selecciona un paciente para consultar su evolución o registrar una nueva atención. Los
            originales y las correcciones se conservarán por separado.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={16} aria-hidden="true" /> Acceso clínico protegido y auditable
          </p>
        </section>
      )}
    </div>
  )
}
function ClinicalWorkspace({
  encounterId,
  onPatientChange,
  patientId,
  tab,
  setTab,
  dateFormat,
  timeZone,
}: {
  encounterId?: string
  onPatientChange: (items: PickedEntity[]) => void
  patientId: string
  tab: string
  setTab: (tab: string) => void
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    patient = useQueryData<Patient>('/api/v1/patients/' + patientId)
  const [dentists, setDentists] = useState<PickedEntity[]>([])
  const tabs = [
    ...(auth.can('CLINICAL_READ')
      ? [
          ['atenciones', 'Atenciones'],
          ['antecedentes', 'Antecedentes'],
          ['odontograma', 'Odontograma'],
        ]
      : []),
    ...(auth.can('DOCUMENTS_READ')
      ? [
          ['documentos', 'Archivos'],
          ['consentimientos', 'Consentimientos'],
        ]
      : []),
  ]
  const current = tabs.some((item) => item[0] === tab) ? tab : tabs[0]?.[0]
  if (patient.loading) return <p role="status">Cargando ficha…</p>
  if (patient.error)
    return (
      <p role="alert" className="error-box">
        {patient.error}
      </p>
    )
  if (!patient.data) return null
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5">
        <EntityPicker
          label="Paciente"
          source={{ endpoint: '/api/v1/patients', labelKey: 'label' }}
          selected={[{ id: patientId, label: patient.data.label }]}
          onChange={onPatientChange}
        />
      </section>
      <section className="rounded-2xl border border-line bg-brand-50 p-5 sm:p-6">
        <p className="text-xs font-medium text-brand-700">
          {patient.data.code}
          {patient.data.provisional ? ' · Ficha provisional' : ''}
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{patient.data.fullName}</h2>
        <p className="mt-2 text-sm text-muted">
          Las modificaciones clínicas conservan su fecha y responsable.
        </p>
      </section>
      {auth.can('CLINICAL_WRITE') && (
        <section className="rounded-xl border border-line bg-white p-4">
          <EntityPicker
            label="Odontólogo responsable"
            source={{
              endpoint: '/api/v1/dentists',
              labelKey: 'fullName',
              filters: { active: 'true' },
            }}
            selected={dentists}
            onChange={setDentists}
          />
          <p className="mt-2 text-xs text-muted">
            Selecciona tu registro profesional. Un administrador puede elegir al profesional
            responsable.
          </p>
        </section>
      )}
      <nav
        aria-label="Secciones del expediente"
        className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={current === key ? 'page' : undefined}
            className={
              'min-h-11 shrink-0 rounded-lg px-4 text-sm ' +
              (current === key ? 'bg-brand-50 font-semibold text-brand-700' : 'text-muted')
            }
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {current === 'atenciones' && (
        <EncountersPanel
          initialEncounterId={encounterId}
          patientId={patientId}
          dentist={dentists[0]}
          dateFormat={dateFormat}
          timeZone={timeZone}
        />
      )}
      {current === 'antecedentes' && (
        <BackgroundPanel
          patientId={patientId}
          dentistId={dentists[0]?.id}
          dateFormat={dateFormat}
          timeZone={timeZone}
        />
      )}
      {current === 'odontograma' && (
        <OdontogramPanel
          patientId={patientId}
          dentistId={dentists[0]?.id}
          dateFormat={dateFormat}
          timeZone={timeZone}
        />
      )}
      {current === 'documentos' && (
        <DocumentsPanel patientId={patientId} dateFormat={dateFormat} timeZone={timeZone} />
      )}
      {current === 'consentimientos' && (
        <ConsentsPanel patient={patient.data} dateFormat={dateFormat} timeZone={timeZone} />
      )}
    </div>
  )
}
