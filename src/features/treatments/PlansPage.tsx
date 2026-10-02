import { useErrorNotification } from '../../shared/notifications/useErrorNotification'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { PatientPicker } from '../patients/components/PatientPicker'
import { usePagedList } from '../../shared/data/usePagedList'
import { Button } from '../../shared/ui/Button'
import { PagedTable } from '../../shared/ui/PagedTable'
import { errorMessage } from '../../shared/api/http'
import { PlanEditor } from './components/PlanEditor'
import { PlanDetail } from './components/PlanDetail'
import { PlanAction } from './components/PlanAction'
import { getPlan, getPlanItems } from './services/treatmentService'
import { money, planStates, type Plan, type PlanItem } from './model/treatments'
export function PlansPage() {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    patientId = params.get('patientId') ?? '',
    [status, setStatus] = useState(''),
    list = usePagedList<Plan>(
      '/api/v1/plans',
      { patientId, status, direction: 'desc' },
      'createdAt',
    ),
    [selected, setSelected] = useState<Plan>(),
    [editor, setEditor] = useState<'new' | 'edit' | 'additional'>(),
    [action, setAction] = useState(''),
    [lines, setLines] = useState<PlanItem[]>([]),
    setError = useErrorNotification()
  function saved() {
    setSelected(undefined)
    setEditor(undefined)
    setAction('')
    list.reload()
  }
  async function open(id: string) {
    setError('')
    try {
      setSelected(await getPlan(id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  async function edit() {
    if (!selected) return
    setError('')
    try {
      setLines((await getPlanItems(selected.id)).items)
      setEditor('edit')
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  if (!auth.can('PLANS_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar planes.
      </p>
    )
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Gestión · Acuerdos y seguimiento</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Presupuestos y planes</h1>
        <p className="mt-2 text-sm text-muted">
          Importes acordados, sesiones y avance. La deuda nace al aceptar el plan.
        </p>
      </header>
      <section className="rounded-2xl border border-line bg-white p-5">
        <PatientPicker
          patientId={patientId}
          onChange={(items) => {
            setParams(items[0] ? { patientId: items[0].id } : {})
            setSelected(undefined)
          }}
        />
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {patientId ? 'Planes del paciente seleccionado' : 'Presupuestos y planes del consultorio'}
        </p>
        {auth.can('PLANS_WRITE') && (
          <Button
            disabled={!patientId}
            onClick={() => {
              setSelected(undefined)
              setLines([])
              setEditor('new')
            }}
          >
            Nuevo presupuesto
          </Button>
        )}
      </div>
      <PagedTable
        list={list}
        keyFor={(p) => p.id}
        filters={
          <label className="field-label">
            Estado
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(planStates).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        }
        columns={[
          {
            label: 'Presupuesto',
            render: (p) => (
              <>
                <p className="font-semibold">{p.code}</p>
                <p>{p.title}</p>
              </>
            ),
          },
          {
            label: 'Paciente y profesional',
            render: (p) => (
              <>
                {p.patientName}
                <p className="mt-1 text-xs text-muted">{p.dentistName}</p>
              </>
            ),
          },
          { label: 'Estado', render: (p) => planStates[p.status] },
          { label: 'Importe', render: (p) => money(p.originalTotal, p.currency) },
          { label: 'Avance', render: (p) => p.completedSessions + ' / ' + p.totalSessions },
        ]}
        actions={(p) => (
          <Button variant="secondary" onClick={() => void open(p.id)}>
            Ver plan
          </Button>
        )}
      />
      {selected && !editor && !action && (
        <PlanDetail
          plan={selected}
          onClose={() => setSelected(undefined)}
          onEdit={() => void edit()}
          onAdditional={() => setEditor('additional')}
          onAction={setAction}
        />
      )}
      {editor && (
        <PlanEditor
          patientId={selected?.patientId ?? patientId}
          plan={editor === 'new' ? undefined : selected}
          lines={lines}
          additional={editor === 'additional'}
          onClose={() => setEditor(undefined)}
          onSaved={saved}
        />
      )}
      {selected && action && (
        <PlanAction plan={selected} action={action} onClose={() => setAction('')} onSaved={saved} />
      )}
    </div>
  )
}
