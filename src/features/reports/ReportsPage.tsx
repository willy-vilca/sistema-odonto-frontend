import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, RefreshCw, ChartNoAxesCombined } from 'lucide-react'
import { useAuth } from '../auth/hooks/useAuth'
import { useQueryData } from '../../shared/data/useQueryData'
import { useErrorNotification } from '../../shared/notifications/useErrorNotification'
import { errorMessage } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
import { PagedTable } from '../../shared/ui/PagedTable'
import { EntityPicker } from '../../shared/ui/EntityPicker'
import { clinicToday, formatLocalDate } from '../../shared/data/dateFormat'
import { decimalMoney } from '../../shared/data/decimal'
import { PeriodFilter } from './components/PeriodFilter'
import { ReportTotals } from './components/ReportTotals'
import { ReportRowActions } from './components/ReportRowActions'
import { useReportList } from './hooks/useReportList'
import { exportReport } from './services/reportService'
import {
  paymentMethods,
  type ReportCatalog,
  type ReportDefinition,
  type ReportRow,
} from './model/reports'

export function ReportsPage({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const auth = useAuth()
  return auth.can('REPORTS_READ') ? (
    <ReportsWorkspace timeZone={timeZone} dateFormat={dateFormat} />
  ) : (
    <p role="alert" className="error-box">
      No tienes permiso para consultar reportes.
    </p>
  )
}
function ReportsWorkspace({ timeZone, dateFormat }: { timeZone: string; dateFormat: string }) {
  const catalog = useQueryData<ReportCatalog>('/api/v1/reports/catalog')
  const [params, setParams] = useSearchParams()
  const current =
    catalog.data?.reports.find((r) => r.type === params.get('type')) || catalog.data?.reports[0]
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Gestión · Consulta y seguimiento</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reportes del consultorio</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Consulta la actividad y las cuentas con cifras verificables, sin confundir tratamientos,
          deuda y dinero recibido.
        </p>
      </header>
      {catalog.error && (
        <p role="alert" className="error-box">
          {catalog.error}
        </p>
      )}
      {catalog.loading && <p role="status">Cargando reportes…</p>}
      {catalog.data && !current && (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <ChartNoAxesCombined className="mx-auto text-muted" aria-hidden="true" />
          <p className="mt-3">No hay reportes habilitados para las áreas de tu rol.</p>
        </div>
      )}
      {catalog.data && current && (
        <>
          <label className="field-label max-w-md">
            Reporte
            <select
              className="field"
              value={current.type}
              onChange={(e) => {
                const next = new URLSearchParams()
                next.set('type', e.target.value)
                for (const key of ['from', 'to'])
                  if (params.get(key)) next.set(key, params.get(key)!)
                setParams(next)
              }}
            >
              {catalog.data.reports.map((report) => (
                <option key={report.type} value={report.type}>
                  {report.title}
                </option>
              ))}
            </select>
          </label>
          <ReportWorkspace
            key={current.type}
            definition={current}
            catalog={catalog.data}
            params={params}
            setParams={setParams}
            timeZone={timeZone}
            dateFormat={dateFormat}
          />
        </>
      )}
    </div>
  )
}
function ReportWorkspace({
  definition,
  catalog,
  params,
  setParams,
  timeZone,
  dateFormat,
}: {
  definition: ReportDefinition
  catalog: ReportCatalog
  params: URLSearchParams
  setParams: (params: URLSearchParams, options?: { replace?: boolean }) => void
  timeZone: string
  dateFormat: string
}) {
  const auth = useAuth()
  const today = clinicToday(timeZone)
  const normalized = new URLSearchParams(params)
  if (!normalized.get('from')) normalized.set('from', today.slice(0, 7) + '-01')
  if (!normalized.get('to')) normalized.set('to', today)
  const [exporting, setExporting] = useState<string>()
  const setError = useErrorNotification()
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(normalized)
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value)
      else next.delete(key)
    setParams(next, { replace: true })
  }
  const list = useReportList(definition, normalized, change)
  async function download(format: 'CSV' | 'PDF') {
    if (exporting) return
    setExporting(format)
    try {
      await exportReport(definition, normalized, format)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setExporting(undefined)
    }
  }
  function cell(row: ReportRow, key: string, kind: string) {
    const value = row.values[key] || ''
    if (kind === 'MONEY')
      return (
        <span className="whitespace-nowrap font-medium">
          {decimalMoney(value || '0', row.values.currency || 'PEN')}
        </span>
      )
    if (kind === 'DATE' || kind === 'DATE_TIME')
      return value
        ? formatLocalDate(value.slice(0, 10), dateFormat) +
            (kind === 'DATE_TIME' ? ' · ' + value.slice(11, 16) : '')
        : '—'
    if (kind === 'STATE')
      return (
        <span
          className={
            ['CANCELLED', 'NO_SHOW', 'OVERDUE', 'REVIEW', 'REVERSAL', 'REFUND'].includes(row.state)
              ? 'status-inactive'
              : 'status-active'
          }
        >
          {value}
        </span>
      )
    return value || '—'
  }
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">{definition.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{definition.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="quiet"
              aria-label="Actualizar reporte"
              disabled={list.loading}
              onClick={list.reload}
            >
              <RefreshCw size={18} aria-hidden="true" />
            </Button>
            {catalog.canExport && (
              <>
                {(['CSV', 'PDF'] as const).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    disabled={!!exporting || list.loading || !list.report}
                    onClick={() => void download(format)}
                  >
                    <FileDown size={17} aria-hidden="true" />
                    {exporting === format ? 'Preparando…' : 'Exportar ' + format}
                  </Button>
                ))}
              </>
            )}
          </div>
        </div>
        <PeriodFilter
          value={{ from: normalized.get('from')!, to: normalized.get('to')! }}
          today={today}
          onChange={(period) => change({ ...period, page: '' })}
        />
        {definition.type === 'INSTALLMENTS' && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={normalized.get('includeEarlier') === 'true'}
              onChange={(e) => change({ includeEarlier: e.target.checked ? 'true' : '', page: '' })}
            />
            Incluir cuotas anteriores al período
          </label>
        )}
        {(definition.dentist || definition.patient) && (
          <details
            open={!!normalized.get('dentistId') || !!normalized.get('patientId')}
            className="rounded-xl border border-line p-4"
          >
            <summary className="min-h-11 cursor-pointer pt-2 text-sm font-semibold text-brand-700">
              Filtrar por profesional o paciente
            </summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {definition.dentist && auth.can('DENTISTS_READ') && (
                <EntityPicker
                  label="Profesional"
                  source={{ endpoint: '/api/v1/dentists', labelKey: 'fullName' }}
                  selected={
                    normalized.get('dentistId')
                      ? [
                          {
                            id: normalized.get('dentistId')!,
                            label: normalized.get('dentistName') || 'Profesional seleccionado',
                          },
                        ]
                      : []
                  }
                  onChange={(items) =>
                    change({
                      dentistId: items[0]?.id || '',
                      dentistName: items[0]?.label || '',
                      page: '',
                    })
                  }
                />
              )}
              {definition.patient && auth.can('PATIENTS_READ') && (
                <EntityPicker
                  label="Paciente"
                  source={{ endpoint: '/api/v1/patients', labelKey: 'label' }}
                  selected={
                    normalized.get('patientId')
                      ? [
                          {
                            id: normalized.get('patientId')!,
                            label: normalized.get('patientName') || 'Paciente seleccionado',
                          },
                        ]
                      : []
                  }
                  onChange={(items) =>
                    change({
                      patientId: items[0]?.id || '',
                      patientName: items[0]?.label || '',
                      page: '',
                    })
                  }
                />
              )}
            </div>
          </details>
        )}
      </section>
      {!list.loading && list.report && (
        <>
          <ReportTotals metrics={list.report.totals} />
          <p className="text-xs text-muted">
            Totales de todo el resultado filtrado ·{' '}
            {definition.type === 'BALANCES'
              ? 'Corte al ' + formatLocalDate(list.report.to, dateFormat)
              : formatLocalDate(list.report.from, dateFormat) +
                ' al ' +
                formatLocalDate(list.report.to, dateFormat)}
            .
          </p>
        </>
      )}
      <PagedTable<ReportRow>
        list={list}
        keyFor={(row) => row.id}
        columns={definition.columns.map((column) => ({
          label: column.label,
          className:
            column.kind === 'MONEY' || column.kind === 'DATE_TIME'
              ? 'min-w-40'
              : column.kind === 'TEXT' && column.key !== 'currency'
                ? 'min-w-44'
                : 'min-w-28',
          render: (row) => cell(row, column.key, column.kind),
        }))}
        actions={(row) => <ReportRowActions type={definition.type} row={row} />}
        filters={
          <>
            {!!Object.keys(definition.statuses).length && (
              <label className="field-label">
                Estado
                <select
                  className="field"
                  value={normalized.get('status') || ''}
                  onChange={(e) => change({ status: e.target.value, page: '' })}
                >
                  <option value="">Todos</option>
                  {Object.entries(definition.statuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {definition.currency && (
              <label className="field-label">
                Moneda
                <select
                  className="field"
                  value={normalized.get('currency') || ''}
                  onChange={(e) => change({ currency: e.target.value, page: '' })}
                >
                  <option value="">Todas</option>
                  {catalog.currencies.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            )}
            {definition.method && (
              <label className="field-label">
                Medio de pago
                <select
                  className="field"
                  value={normalized.get('method') || ''}
                  onChange={(e) => change({ method: e.target.value, page: '' })}
                >
                  <option value="">Todos</option>
                  {Object.entries(paymentMethods).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field-label">
              Ordenar por
              <select
                className="field"
                value={normalized.get('sort') || definition.defaultSort}
                onChange={(e) => change({ sort: e.target.value, page: '' })}
              >
                {definition.columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Orden
              <select
                className="field"
                value={
                  normalized.get('direction') ||
                  (definition.defaultSort === 'patient' ? 'asc' : 'desc')
                }
                onChange={(e) => change({ direction: e.target.value, page: '' })}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </label>
          </>
        }
      />
      <p className="hidden text-xs text-muted md:block">
        Desliza la tabla horizontalmente para consultar todas sus columnas.
      </p>
    </div>
  )
}
