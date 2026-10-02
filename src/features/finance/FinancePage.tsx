import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { PatientPicker } from '../patients/components/PatientPicker'
import { Button } from '../../shared/ui/Button'
import { FinanceAccount } from './components/FinanceAccount'
import { CashPanel } from './components/CashPanel'
import { ExpensePanel } from './components/ExpensePanel'
import { ResourcePage } from '../configuration/components/ResourcePage'
import type { ResourceDefinition } from '../configuration/model/resources'
import { clinicToday } from '../../shared/data/dateFormat'
const categories: ResourceDefinition = {
  endpoint: '/api/v1/finance/expense-categories',
  title: 'Categorías de egresos',
  singular: 'categoría',
  description: 'Organiza los gastos. Desactivar una categoría conserva sus movimientos históricos.',
  read: 'FINANCES_READ',
  write: 'FINANCE_CONFIG_WRITE',
  defaults: { name: '', active: true },
  fields: [
    { key: 'name', label: 'Nombre de la categoría', required: true, maxLength: 120 },
    { key: 'active', label: 'Categoría activa', type: 'checkbox' },
  ],
  columns: [
    { label: 'Categoría', render: (r) => String(r.name) },
    { label: 'Estado', render: (r) => (r.active ? 'Activa' : 'Inactiva') },
  ],
}
export function FinancePage({
  currency,
  timeZone,
  dateFormat,
}: {
  currency: string
  timeZone: string
  dateFormat: string
}) {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    patientId = params.get('patientId') ?? '',
    [section, setSection] = useState('Cuenta del paciente'),
    today = clinicToday(timeZone)
  if (!auth.can('FINANCES_READ'))
    return (
      <p role="alert" className="error-box">
        No tienes permiso para consultar finanzas.
      </p>
    )
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Gestión · Finanzas del consultorio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cobros y cuentas claras</h1>
        <p className="mt-2 text-sm text-muted">
          Saldos, anticipos y vencimientos con cada movimiento explicado.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Áreas financieras">
        {[
          'Cuenta del paciente',
          'Egresos',
          ...(auth.can('CASH_READ') ? ['Caja'] : []),
          'Categorías',
        ].map((s) => (
          <Button
            key={s}
            variant={section === s ? 'primary' : 'secondary'}
            aria-pressed={section === s}
            onClick={() => setSection(s)}
          >
            {s}
          </Button>
        ))}
      </nav>
      {section === 'Cuenta del paciente' && (
        <>
          <section className="rounded-2xl border border-line bg-white p-5">
            <PatientPicker
              patientId={patientId}
              onChange={(items) => setParams(items[0] ? { patientId: items[0].id } : {})}
            />
          </section>
          {patientId ? (
            <FinanceAccount
              dateFormat={dateFormat}
              key={patientId}
              patientId={patientId}
              currency={currency}
              today={today}
              timeZone={timeZone}
            />
          ) : (
            <p className="rounded-xl border border-line p-6 text-sm text-muted">
              Selecciona un paciente para consultar sus cargos, abonos, cuotas y saldo.
            </p>
          )}
        </>
      )}
      {section === 'Egresos' && (
        <ExpensePanel
          timeZone={timeZone}
          dateFormat={dateFormat}
          currency={currency}
          today={today}
        />
      )}{' '}
      {section === 'Caja' && auth.can('CASH_READ') && (
        <CashPanel timeZone={timeZone} dateFormat={dateFormat} currency={currency} today={today} />
      )}{' '}
      {section === 'Categorías' && <ResourcePage resource={categories} />}
    </div>
  )
}
