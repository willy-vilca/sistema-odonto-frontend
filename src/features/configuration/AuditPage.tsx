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
const modules: Record<string, string> = {
  SECURITY: 'Seguridad',
  USER: 'Usuarios',
  ROLE: 'Permisos',
  INSTALLATION: 'Consultorio',
  SETTINGS: 'Consultorio',
  LOGO: 'Logo',
  CATEGORY: 'Categorías',
  SERVICE: 'Servicios',
  DENTIST: 'Odontólogos',
  PERIOD: 'Horarios',
  EXCEPTION: 'Bloqueos',
  PATIENT: 'Pacientes',
  APPOINTMENT: 'Agenda',
  PLAN: 'Tratamientos',
  CHARGE: 'Cargos',
  PAYMENT: 'Pagos',
  EXPENSE: 'Egresos',
  CASH: 'Caja',
  INSTALLMENT: 'Cuotas',
  FINANCIAL_DOCUMENT: 'Constancias',
  EXPENSE_CATEGORY: 'Categorías de egresos',
  ENCOUNTER: 'Atenciones',
  CLINICAL_STATE: 'Historia clínica',
  CLINICAL_TEMPLATE: 'Plantillas clínicas',
  DOCUMENT: 'Documentos clínicos',
  CONSENT: 'Consentimientos',
  DOCUMENT_CATEGORY: 'Categorías documentales',
  DOCUMENT_POLICY: 'Reglas de archivos',
  AGENT_CONTROL: 'Atención de conversaciones',
  AGENT_CONVERSATION: 'Atención de conversaciones',
  AGENT_POLICY: 'Reglas del asistente',
  AGENT_RUN: 'Incidencias del asistente',
  AGENT_BOOKING: 'Reservas del asistente',
  REPORT: 'Exportaciones',
}
const actions: Record<string, string> = {
  CHARGE_CLOSED: 'Cargo finalizado',
  CHARGE_REOPENED: 'Cargo reabierto',
  CHARGE_ISSUED: 'Cargo generado',
  CHARGE_ADJUSTED: 'Cargo ajustado',
  PAYMENT_REGISTERED: 'Pago registrado',
  ADVANCE_APPLIED: 'Anticipo aplicado',
  PAYMENT_RELEASED: 'Aplicación liberada',
  PAYMENT_REFUND: 'Devolución de pago',
  PAYMENT_REVERSAL: 'Pago revertido',
  CASH_OPENED: 'Caja abierta',
  CASH_CLOSED: 'Caja cerrada',
  ENCOUNTER_CREATED: 'Atención iniciada',
  ENCOUNTER_FINALIZED: 'Atención finalizada',
  ENCOUNTER_CORRECTED: 'Atención corregida',
  ENCOUNTER_CHECKOUT: 'Atención cobrada',
  DOCUMENT_VIEWED: 'Documento visualizado',
  DOCUMENT_DOWNLOADED: 'Documento descargado',
  REPORT_EXPORTED: 'Reporte exportado',
  LOGIN_FAILED: 'Intento de acceso fallido',
  AGENT_HANDOFF: 'Conversación derivada',
  AGENT_FAILED: 'Fallo del asistente',
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
          Cambios esenciales de agenda, clínica, finanzas y permisos, con responsable y fecha.
          Incluye accesos a documentos sensibles; las consultas rutinarias no generan registros.
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
                <p>{actions[r.action] ?? r.summary}</p>
                {actions[r.action] && <p className="mt-1 text-sm text-muted">{r.summary}</p>}
                <p className="mt-1 text-xs text-muted">
                  {modules[r.entityType] ?? 'Operación del sistema'}
                </p>
              </div>
            ),
          },
          {
            label: 'Referencia',
            render: (r) => (
              <details className="max-w-56 break-all text-xs text-muted">
                <summary className="min-h-11 cursor-pointer py-3">Ver referencia</summary>
                <p>
                  {r.entityType} · {r.entityId}
                </p>
                {r.requestId && <p className="mt-1">Solicitud: {r.requestId}</p>}
              </details>
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
                  'PLAN',
                  'CHARGE',
                  'PAYMENT',
                  'EXPENSE',
                  'CASH',
                  'INSTALLMENT',
                  'FINANCIAL_DOCUMENT',
                  'EXPENSE_CATEGORY',
                  'ENCOUNTER',
                  'CLINICAL_STATE',
                  'CLINICAL_TEMPLATE',
                  'DOCUMENT',
                  'CONSENT',
                  'DOCUMENT_CATEGORY',
                  'DOCUMENT_POLICY',
                  'AGENT_CONTROL',
                  'AGENT_CONVERSATION',
                  'AGENT_POLICY',
                  'AGENT_RUN',
                  'REPORT',
                ].map((v) => (
                  <option key={v} value={v}>
                    {modules[v] ?? v}
                  </option>
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
