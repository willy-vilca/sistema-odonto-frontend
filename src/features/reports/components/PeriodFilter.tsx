import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import type { Period } from '../model/reports'
import { dateAdd } from '../../appointments/model/calendar'

export function PeriodFilter({
  value,
  today,
  onChange,
}: {
  value: Period
  today: string
  onChange: (value: Period) => void
}) {
  const appliedKey = value.from + '|' + value.to
  const [editing, setEditing] = useState({ key: appliedKey, value })
  const draft = editing.key === appliedKey ? editing.value : value
  function setDraft(next: Period) {
    setEditing({ key: appliedKey, value: next })
  }
  const presets = [
    { label: 'Hoy', value: { from: today, to: today } },
    { label: 'Este mes', value: { from: today.slice(0, 7) + '-01', to: today } },
    { label: 'Últimos 30 días', value: { from: dateAdd(today, -29), to: today } },
    { label: 'Este año', value: { from: today.slice(0, 4) + '-01-01', to: today } },
  ]
  return (
    <form
      aria-label="Período de consulta"
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onChange(draft)
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant={
              value.from === preset.value.from && value.to === preset.value.to ? 'primary' : 'quiet'
            }
            className="text-xs"
            onClick={() => {
              setDraft(preset.value)
              onChange(preset.value)
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="field-label min-w-0 flex-1 basis-36">
          Desde
          <input
            type="date"
            required
            className="field"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="field-label min-w-0 flex-1 basis-36">
          Hasta
          <input
            type="date"
            required
            className="field"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <Button type="submit" variant="secondary">
          Aplicar período
        </Button>
      </div>
    </form>
  )
}
