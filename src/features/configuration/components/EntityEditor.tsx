import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage, saveJson } from '../../../shared/api/http'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { EntityPicker, type PickedEntity } from '../../../shared/ui/EntityPicker'
import {
  timeLabel,
  type EntityRow,
  type ResourceDefinition,
  type FieldDefinition,
} from '../model/resources'
export function EntityEditor({
  resource,
  row,
  onClose,
  onSaved,
  editable = true,
}: {
  resource: ResourceDefinition
  row: EntityRow | null
  onClose: () => void
  onSaved: () => void
  editable?: boolean
}) {
  const [values, setValues] = useState<Record<string, unknown>>(
    row ? { ...row } : { ...resource.defaults },
  )
  const [selection, setSelection] = useState<Record<string, PickedEntity[]>>(() =>
    Object.fromEntries(
      resource.fields
        .filter((f) => f.type === 'picker')
        .map((f) => [f.key, row ? (f.selected?.(row) ?? []) : []]),
    ),
  )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({})
  function change(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }))
    setFields((f) => ({ ...f, [key]: '' }))
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    const prepared = resource.prepare ? resource.prepare(values, !!row) : values,
      validation = resource.validate?.(prepared)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError('')
    setFields({})
    try {
      const id = row ? (resource.keyFor?.(row) ?? row.id) : ''
      await saveJson(resource.endpoint + (row ? '/' + id : ''), prepared, row ? 'PUT' : 'POST')
      onSaved()
    } catch (e) {
      setError(errorMessage(e))
      if (e instanceof ApiError) setFields(e.fields)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={(row ? 'Editar ' : 'Crear ') + resource.singular} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={!editable || busy} className="grid min-w-0 gap-5 sm:grid-cols-2">
          {resource.fields.map((f) => (
            <div
              key={f.key}
              className={
                ['textarea', 'picker', 'multi'].includes(f.type ?? '') ? 'sm:col-span-2' : ''
              }
            >
              <EditorField
                definition={f}
                value={values[f.key]}
                selected={selection[f.key] ?? []}
                disabled={!editable || busy || (!!row && !!f.immutable)}
                error={fields[f.key]}
                onChange={(value) => change(f.key, value)}
                onSelection={(items) => {
                  setSelection((s) => ({ ...s, [f.key]: items }))
                  change(f.key, f.multiple ? items.map((i) => i.id) : (items[0]?.id ?? null))
                }}
              />
              {fields[f.key] && <p className="mt-2 text-xs text-red-800">{fields[f.key]}</p>}
            </div>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cerrar
          </Button>
          {editable && <Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>}
        </div>
      </form>
    </Modal>
  )
}
function EditorField({
  definition: f,
  value,
  onChange,
  selected,
  onSelection,
  disabled,
  error,
}: {
  definition: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  selected: PickedEntity[]
  onSelection: (value: PickedEntity[]) => void
  disabled: boolean
  error?: string
}) {
  if (f.type === 'picker')
    return (
      <EntityPicker
        label={f.label}
        source={f.source!}
        selected={selected}
        multiple={f.multiple}
        onChange={onSelection}
        disabled={disabled}
      />
    )
  if (f.type === 'checkbox')
    return (
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 accent-brand-700"
        />
        <span>{f.label}</span>
      </label>
    )
  if (f.type === 'multi')
    return (
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{f.label}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {f.options?.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={((value as string[]) ?? []).includes(option.value)}
                disabled={disabled || (f.immutable && option.value === 'ROLES_WRITE')}
                className="size-5 accent-brand-700"
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...((value as string[]) ?? []), option.value]
                      : ((value as string[]) ?? []).filter((v) => v !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    )
  return (
    <label className="field-label">
      {f.label}
      {f.type === 'select' ? (
        <select
          aria-label={f.label}
          className="field"
          value={String(value ?? '')}
          required={f.required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {f.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea
          className="field min-h-24"
          required={f.required}
          value={String(value ?? '')}
          maxLength={f.maxLength ?? 1000}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field"
          aria-label={f.label}
          type={f.type ?? 'text'}
          value={
            f.type === 'time' && typeof value === 'number' ? timeLabel(value) : String(value ?? '')
          }
          required={f.required}
          min={f.min}
          max={f.max}
          maxLength={f.maxLength ?? (f.type === 'password' ? 72 : 120)}
          step={f.step}
          disabled={disabled}
          autoComplete={f.type === 'password' ? 'new-password' : 'off'}
          aria-invalid={!!error}
          onChange={(e) =>
            onChange(
              f.type === 'number'
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
      {f.hint && <span className="field-help">{f.hint}</span>}
    </label>
  )
}
