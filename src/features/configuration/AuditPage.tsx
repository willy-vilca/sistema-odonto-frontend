import { dateLocale } from '../../shared/data/dateFormat'
import { useState } from 'react'
import { usePagedList } from '../../shared/data/usePagedList'
import { PagedTable } from '../../shared/ui/PagedTable'
interface AuditRow {
  id: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  summary: string
  requestId: string
  occurredAt: string
}
export function AuditPage({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const [entityType, setEntityType] = useState(''),
    [fromDate, setFromDate] = useState(''),
    [toDate, setToDate] = useState('')
  const list = usePagedList<AuditRow>(
    '/api/v1/audit-events',
    { entityType, fromDate, toDate, direction: 'desc' },
    'date',
  )
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Auditoría de operaciones</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Registro de accesos y cambios sensibles, con responsable y fecha. Se conserva como
          evidencia de cada operación.
        </p>
      </div>
      <PagedTable
        list={list}
        keyFor={(r) => r.id}
        columns={[
          {
            label: 'Fecha',
            render: (r) =>
              new Intl.DateTimeFormat(dateLocale(dateFormat), {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone,
              }).format(new Date(r.occurredAt)),
          },
          { label: 'Responsable', render: (r) => r.actorName },
          {
            label: 'Operación',
            render: (r) => (
              <div>
                <p>{r.summary}</p>
                <p className="mt-1 text-xs text-muted">{r.action}</p>
              </div>
            ),
          },
          {
            label: 'Referencia',
            render: (r) => (
              <div className="max-w-56 break-all text-xs text-muted">
                <p>
                  {r.entityType} · {r.entityId}
                </p>
                {r.requestId && <p className="mt-1">Solicitud: {r.requestId}</p>}
              </div>
            ),
          },
        ]}
        filters={
          <>
            <label className="field-label">
              Módulo
              <select
                className="field"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                <option value="">Todos</option>
                {[
                  'SECURITY',
                  'USER',
                  'ROLE',
                  'INSTALLATION',
                  'LOGO',
                  'CATEGORY',
                  'SERVICE',
                  'DENTIST',
                  'PERIOD',
                  'EXCEPTION',
                  'PATIENT',
                  'APPOINTMENT',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Desde
              <input
                type="date"
                className="field"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="field-label">
              Hasta
              <input
                type="date"
                className="field"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </>
        }
      />
    </div>
  )
}
