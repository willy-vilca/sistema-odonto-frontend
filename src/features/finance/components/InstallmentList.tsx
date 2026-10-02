import { formatLocalDate } from '../../../shared/data/dateFormat'
import { useState } from 'react'
import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { money } from '../../treatments/model/treatments'
import { dueStates, type Due } from '../model/payments'
export function InstallmentList({
  patientId,
  dateFormat,
}: {
  patientId: string
  dateFormat: string
}) {
  const [active, setActive] = useState('true'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    list = usePagedList<Due>(
      '/api/v1/finance/installments',
      { patientId, active, from, to },
      'dueOn',
    )
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Las cuotas organizan vencimientos. No aumentan la deuda. Si un cargo cambia, su calendario
        muestra «Revisar calendario» hasta distribuir los nuevos importes.
      </p>
      <PagedTable
        list={list}
        keyFor={(i) => i.id}
        filters={
          <>
            <label className="field-label">
              Calendarios
              <select className="field" value={active} onChange={(e) => setActive(e.target.value)}>
                <option value="true">Vigentes</option>
                <option value="false">Anteriores</option>
                <option value="">Todos</option>
              </select>
            </label>
            <label className="field-label">
              Desde
              <input
                className="field"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field-label">
              Hasta
              <input
                className="field"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        }
        columns={[
          {
            label: 'Cuota y vencimiento',
            render: (i) => (
              <>
                <span className="font-semibold">Cuota {i.position}</span>
                <p className="text-xs text-muted">
                  {formatLocalDate(i.dueOn, dateFormat)} · {i.reason}
                </p>
              </>
            ),
          },
          { label: 'Importe', render: (i) => money(i.amount, i.currency) },
          {
            label: 'Pagado y pendiente',
            render: (i) => (
              <>
                {money(i.paid, i.currency)} pagados
                <p className="text-xs text-muted">{money(i.pending, i.currency)} pendientes</p>
              </>
            ),
          },
          {
            label: 'Estado',
            render: (i) => (
              <span className="rounded-lg bg-canvas px-2 py-1 text-xs font-semibold">
                {dueStates[i.status]}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}
