import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { usePagedList } from '../../../shared/data/usePagedList'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  money,
  planStates,
  type Plan,
  type PlanItem,
  type PlanOperation,
} from '../model/treatments'
export function PlanDetail({
  plan,
  onClose,
  onEdit,
  onAction,
  onAdditional,
}: {
  plan: Plan
  onClose: () => void
  onEdit: () => void
  onAction: (action: string) => void
  onAdditional: () => void
}) {
  const auth = useAuth(),
    [tab, setTab] = useState('items')
  return (
    <Modal title={plan.code + ' · ' + plan.title} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="font-semibold">{plan.patientName}</p>
          <p className="mt-1 text-sm">
            {plan.dentistName} · {planStates[plan.status]}
          </p>
          <p className="mt-3 text-sm">
            Presupuesto {plan.acceptedAt ? 'aceptado originalmente' : 'propuesto'}:{' '}
            <strong>{money(plan.originalTotal, plan.currency)}</strong>
          </p>
          <p className="mt-2 text-sm">
            Cargos y ajustes del plan: <strong>{money(plan.currentDebt, plan.currency)}</strong>
          </p>
          <p className="mt-2 text-sm">
            Avance: {plan.completedSessions} de {plan.totalSessions} sesiones
          </p>
        </div>
        <section>
          <h3 className="font-semibold">Condiciones</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">
            {plan.conditions || 'Sin condiciones adicionales.'}
          </p>
          {plan.acceptedBy && <p className="mt-3 text-sm">Aceptado por {plan.acceptedBy}</p>}
        </section>
        <div className="flex flex-wrap gap-2">
          {auth.can('PLANS_WRITE') && (
            <>
              {['DRAFT', 'PROPOSED'].includes(plan.status) && (
                <Button variant="secondary" onClick={onEdit}>
                  Editar presupuesto
                </Button>
              )}
              {plan.status === 'DRAFT' && (
                <Button onClick={() => onAction('propose')}>Presentar presupuesto</Button>
              )}
              {plan.status === 'PROPOSED' && (
                <Button onClick={() => onAction('accept')}>Aceptar plan</Button>
              )}
              {['ACCEPTED', 'IN_PROGRESS'].includes(plan.status) && (
                <>
                  <Button variant="secondary" onClick={onAdditional}>
                    Añadir adicional
                  </Button>
                  <Button onClick={() => onAction('finish')}>Finalizar plan</Button>
                </>
              )}
              {!['FINISHED', 'CANCELLED'].includes(plan.status) && (
                <Button variant="quiet" onClick={() => onAction('cancel')}>
                  Cancelar plan
                </Button>
              )}
            </>
          )}
          {auth.can('FINANCES_READ') && (
            <Link
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-700"
              to={'/finanzas?patientId=' + plan.patientId}
            >
              Ver movimientos de deuda
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Detalle del plan">
          {[
            ['items', 'Tratamientos y avance'],
            ['history', 'Historial'],
            ['sessions', 'Sesiones realizadas'],
          ].map(([key, label]) => (
            <Button
              key={key}
              role="tab"
              aria-selected={tab === key}
              variant={tab === key ? 'primary' : 'secondary'}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {tab === 'items' ? (
          <PlanItems plan={plan} />
        ) : tab === 'sessions' ? (
          <CompletedSessions plan={plan} />
        ) : (
          <PlanHistory id={plan.id} />
        )}
      </div>
    </Modal>
  )
}
function PlanItems({ plan }: { plan: Plan }) {
  const list = usePagedList<PlanItem>('/api/v1/plans/items', { planId: plan.id }, 'position')
  return (
    <PagedTable
      list={list}
      keyFor={(i) => i.id}
      columns={[
        {
          label: 'Tratamiento',
          render: (i) => (
            <>
              <p>{i.description}</p>
              <p className="mt-1 text-xs text-muted">
                {i.serviceName || 'Procedimiento propio'}
                {i.tooth ? ' · Pieza ' + i.tooth : ''}
              </p>
            </>
          ),
        },
        {
          label: 'Importe acordado',
          render: (i) =>
            money(i.amount, plan.currency) +
            ' · ' +
            i.quantity +
            ' × ' +
            money(i.unitPrice, plan.currency),
        },
        { label: 'Sesiones', render: (i) => i.completedSessions + ' / ' + i.sessions },
        { label: 'Deuda del tratamiento', render: (i) => money(i.currentDebt, plan.currency) },
      ]}
    />
  )
}
function PlanHistory({ id }: { id: string }) {
  const list = usePagedList<PlanOperation>(
    '/api/v1/plans/' + id + '/history',
    { direction: 'desc' },
    'createdAt',
  )
  return (
    <PagedTable
      list={list}
      keyFor={(o) => o.id}
      columns={[
        {
          label: 'Movimiento',
          render: (o) =>
            (
              ({
                CREATED: 'Presupuesto creado',
                UPDATED: 'Presupuesto editado',
                PROPOSE: 'Propuesto',
                ACCEPT: 'Aceptado',
                FINISH: 'Finalizado',
                CANCEL: 'Cancelado',
                ADDITIONAL: 'Tratamiento adicional',
              }) as Record<string, string>
            )[o.action] ?? o.action,
        },
        { label: 'Motivo', render: (o) => o.reason },
        { label: 'Responsable', render: (o) => o.actorName },
        { label: 'Detalle', render: (o) => o.summary },
      ]}
    />
  )
}

function CompletedSessions({ plan }: { plan: Plan }) {
  const list = usePagedList<{
      id: string
      description: string
      encounterId: string
      sessions: number
      actorName: string
      createdAt: string
    }>('/api/v1/plans/' + plan.id + '/sessions', { direction: 'desc' }, 'createdAt'),
    auth = useAuth()
  return (
    <PagedTable
      list={list}
      keyFor={(s) => s.id}
      columns={[
        { label: 'Tratamiento realizado', render: (s) => s.description },
        { label: 'Sesiones', render: (s) => s.sessions },
        { label: 'Responsable', render: (s) => s.actorName },
      ]}
      actions={(s) =>
        auth.can('CLINICAL_READ') ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
            to={'/clinica?patientId=' + plan.patientId + '&encounterId=' + s.encounterId}
          >
            Ver atención
          </Link>
        ) : null
      }
    />
  )
}
