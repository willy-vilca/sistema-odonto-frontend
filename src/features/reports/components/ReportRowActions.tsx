import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { useErrorNotification } from '../../../shared/notifications/useErrorNotification'
import { errorMessage } from '../../../shared/api/http'
import { downloadReportDocument } from '../services/reportService'
import type { ReportType, ReportRow } from '../model/reports'

export function ReportRowActions({ type, row }: { type: ReportType; row: ReportRow }) {
  const [busy, setBusy] = useState(false)
  const setError = useErrorNotification()
  const patient = row.patientId ? '?patientId=' + row.patientId : ''
  const target =
    type === 'APPOINTMENTS' || type === 'ABSENCES'
      ? '/agenda?appointment=' + row.entityId
      : type === 'TREATMENTS'
        ? '/tratamientos' + patient + '&planId=' + row.entityId
        : type === 'SERVICES'
          ? '/clinica' + patient + '&encounterId=' + row.entityId
          : type === 'EXPENSES'
            ? '/finanzas?section=egresos'
            : '/finanzas' + patient
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to={target}
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        {type === 'APPOINTMENTS' || type === 'ABSENCES'
          ? 'Ver cita'
          : type === 'TREATMENTS'
            ? 'Ver plan'
            : type === 'SERVICES'
              ? 'Ver atención'
              : type === 'EXPENSES'
                ? 'Ver egresos'
                : 'Ver cuenta'}
      </Link>
      {row.documentId && (
        <Button
          variant="quiet"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await downloadReportDocument(row.documentId!)
            } catch (e) {
              setError(errorMessage(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Descargando…' : 'Constancia PDF'}
        </Button>
      )}
    </div>
  )
}
