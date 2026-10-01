import { useState } from 'react'
import { usePagedList } from '../data/usePagedList'
import { Button } from './Button'
export interface PickedEntity {
  id: string
  label: string
}
export interface PickerSource {
  endpoint: string
  labelKey: string
  filters?: Record<string, string>
}
export function EntityPicker({
  label,
  source,
  selected,
  onChange,
  multiple = false,
  disabled = false,
}: {
  label: string
  source: PickerSource
  selected: PickedEntity[]
  onChange: (selected: PickedEntity[]) => void
  multiple?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm break-words"
            >
              {item.label}
              {!disabled && (
                <button
                  type="button"
                  className="min-h-9 min-w-9 rounded-lg text-muted"
                  aria-label={'Quitar ' + item.label}
                  onClick={() => onChange(selected.filter((s) => s.id !== item.id))}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">Sin selección</p>
      )}
      {!disabled && (
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Cerrar búsqueda' : 'Seleccionar ' + label.toLowerCase()}
        </Button>
      )}
      {open && !disabled && (
        <PickerResults
          source={source}
          selected={selected}
          onPick={(item) => {
            onChange(multiple ? [...selected, item] : [item])
            if (!multiple) setOpen(false)
          }}
        />
      )}
    </div>
  )
}
function PickerResults({
  source,
  selected,
  onPick,
}: {
  source: PickerSource
  selected: PickedEntity[]
  onPick: (item: PickedEntity) => void
}) {
  const list = usePagedList<Record<string, unknown>>(source.endpoint, source.filters)
  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-3">
      <label className="field-label">
        Buscar opciones
        <input
          type="search"
          className="field"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
        />
      </label>
      {list.error && (
        <p role="alert" className="error-box">
          {list.error}
        </p>
      )}
      {list.loading ? (
        <p role="status" className="text-xs">
          Buscando…
        </p>
      ) : (
        <div className="space-y-1">
          {list.data?.items.map((item) => (
            <Button
              key={String(item.id)}
              type="button"
              variant="secondary"
              className="w-full justify-start text-left"
              disabled={selected.some((s) => s.id === item.id)}
              onClick={() => onPick({ id: String(item.id), label: String(item[source.labelKey]) })}
            >
              {String(item[source.labelKey])}
            </Button>
          ))}
          {!list.data?.items.length && (
            <p className="text-xs text-muted">
              No hay opciones. Revisa los filtros o crea el registro primero.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <Button
          type="button"
          variant="quiet"
          disabled={list.loading || list.page === 0}
          onClick={() => list.setPage(list.page - 1)}
        >
          Anterior
        </Button>
        <span>
          {list.page + 1} / {list.data?.totalPages || 1}
        </span>
        <Button
          type="button"
          variant="quiet"
          disabled={list.loading || list.page + 1 >= (list.data?.totalPages ?? 0)}
          onClick={() => list.setPage(list.page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
