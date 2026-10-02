import { notify } from '../../shared/notifications/notifications'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/hooks/useAuth'
import { request, saveJson, ApiError, errorMessage } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
interface Settings {
  displayName: string
  timeZone: string
  currency: string
  brandColor: string
  accentColor: string
  hasLogo: boolean
  logoRevision: number
  version: number
  [key: string]: string | number | boolean
}
const sections = [
  {
    title: 'Identidad y contacto',
    fields: [
      ['displayName', 'Nombre del consultorio', 'text', 120],
      ['legalName', 'Nombre legal o del profesional', 'text', 160],
      ['address', 'Dirección', 'text', 250],
      ['phone', 'Teléfono', 'tel', 30],
      ['email', 'Correo electrónico', 'email', 160],
    ],
  },
  {
    title: 'Marca y preferencias',
    fields: [
      ['brandColor', 'Color principal', 'color'],
      ['accentColor', 'Color de fondo destacado', 'color'],
      ['currency', 'Moneda (código ISO)', 'text', 3],
      ['timeZone', 'Zona horaria', 'text', 60],
    ],
  },
  {
    title: 'Reglas de reserva',
    fields: [
      ['minimumLeadMinutes', 'Anticipación mínima (minutos)', 'number', 43800],
      ['appointmentGapMinutes', 'Separación entre citas (minutos)', 'number', 120],
    ],
  },
  {
    title: 'Correlativos iniciales',
    fields: [
      ['patientPrefix', 'Prefijo de pacientes', 'text', 10],
      ['patientNextNumber', 'Siguiente número de paciente', 'number', 999999999],
      ['receiptPrefix', 'Prefijo de constancias', 'text', 10],
      ['receiptNextNumber', 'Siguiente número de constancia', 'number', 999999999],
      ['budgetPrefix', 'Prefijo de presupuestos', 'text', 10],
      ['budgetNextNumber', 'Siguiente número de presupuesto', 'number', 999999999],
    ],
  },
  {
    title: 'Textos del consultorio',
    fields: [
      ['documentHeader', 'Encabezado de documentos', 'textarea', 1000],
      ['documentFooter', 'Pie de documentos', 'textarea', 1000],
      ['appointmentInstructions', 'Indicaciones para las citas', 'textarea', 1000],
    ],
  },
] as const
export function SettingsPage({ onChanged }: { onChanged: () => void }) {
  const auth = useAuth(),
    editable = auth.can('SETTINGS_WRITE'),
    [data, setData] = useState<Settings | null>(null),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    void request<Settings>('/api/v1/settings', { signal: abort.signal })
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorMessage(e))
      })
    return () => abort.abort()
  }, [])
  async function reload() {
    const updated = await request<Settings>('/api/v1/settings')
    setData(updated)
    onChanged()
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    setFields({})
    try {
      const { hasLogo: _has, logoRevision: _rev, ...body } = data!
      setData(await saveJson<Settings>('/api/v1/settings', body, 'PUT'))
      onChanged()
      notify('Configuración guardada correctamente.')
    } catch (e) {
      notify(errorMessage(e), 'error')
      if (e instanceof ApiError) setFields(e.fields)
    } finally {
      setBusy(false)
    }
  }
  async function logo(file: File | null) {
    if (!data) return
    setBusy(true)
    setError('')

    try {
      if (file) {
        const body = new FormData()
        body.set('file', file)
        body.set('version', String(data.version))
        await request('/api/v1/settings/logo', { method: 'POST', body })
      } else await request('/api/v1/settings/logo?version=' + data.version, { method: 'DELETE' })
      await reload()
      notify(file ? 'Logo actualizado.' : 'Logo retirado.')
    } catch (e) {
      notify(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  if (!data)
    return (
      <div className="rounded-2xl border border-line bg-white p-7">
        {error ? (
          <>
            <p role="alert" className="error-box">
              {error}
            </p>
            <Button
              onClick={() => {
                setError('')
                void reload().catch((e) => setError(errorMessage(e)))
              }}
              className="mt-4"
            >
              Reintentar
            </Button>
          </>
        ) : (
          <p role="status">Cargando configuración…</p>
        )}
      </div>
    )
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Tu consultorio, a tu manera</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Una sede, una identidad. Define cómo se presenta y organiza tu consultorio.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-white p-5">
        {data.hasLogo ? (
          <img
            src={'/api/v1/system/logo?v=' + data.logoRevision}
            alt="Logo del consultorio"
            className="size-20 rounded-xl border border-line object-contain p-2"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-xl bg-brand-50 text-sm text-brand-700">
            Logo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Logo del consultorio</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            PNG o JPG, hasta 2 MB y 4096 × 4096 píxeles.
          </p>
          {editable && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="field-label min-w-0 w-full sm:w-auto">
                <span className="sr-only">Subir logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy}
                  className="w-full min-w-0 max-w-full text-xs file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-line file:bg-white file:px-3 file:text-ink"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void logo(file)
                    e.target.value = ''
                  }}
                />
              </label>
              {data.hasLogo && (
                <Button variant="quiet" disabled={busy} onClick={() => void logo(null)}>
                  Retirar logo
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={busy || !editable} className="space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-line bg-white p-5 sm:p-7"
            >
              <h3 className="mb-5 font-semibold">{section.title}</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                {section.fields.map(([key, label, type, max]) => (
                  <label
                    key={key}
                    className={'field-label ' + (type === 'textarea' ? 'sm:col-span-2' : '')}
                  >
                    {label}
                    {type === 'textarea' ? (
                      <textarea
                        className="field min-h-24"
                        value={String(data[key])}
                        maxLength={max}
                        onChange={(e) => setData({ ...data, [key]: e.target.value })}
                      />
                    ) : (
                      <input
                        className={'field ' + (type === 'color' ? 'max-w-36' : '')}
                        type={type}
                        aria-label={label}
                        value={String(data[key])}
                        required={
                          [
                            'displayName',
                            'currency',
                            'timeZone',
                            'brandColor',
                            'accentColor',
                          ].includes(key) || type === 'number'
                        }
                        maxLength={
                          type === 'text' || type === 'email' || type === 'tel' ? max : undefined
                        }
                        min={type === 'number' ? (key.endsWith('NextNumber') ? 1 : 0) : undefined}
                        max={type === 'number' ? max : undefined}
                        step={type === 'number' ? 1 : undefined}
                        aria-invalid={!!fields[key]}
                        onChange={(e) =>
                          setData({
                            ...data,
                            [key]:
                              type === 'number'
                                ? e.target.value === ''
                                  ? ''
                                  : Number(e.target.value)
                                : key === 'currency'
                                  ? e.target.value.toUpperCase()
                                  : e.target.value,
                          })
                        }
                      />
                    )}
                    {fields[key] && <span className="text-xs text-red-800">{fields[key]}</span>}
                    {key === 'timeZone' && (
                      <span className="field-help">
                        Ejemplo: America/Lima. Las horas del consultorio usan esta zona.
                      </span>
                    )}
                    {key === 'brandColor' && (
                      <span className="field-help">
                        Elige un color oscuro para conservar el contraste con texto blanco.
                      </span>
                    )}
                    {key === 'accentColor' && (
                      <span className="field-help">
                        Elige un fondo claro para mantener el texto legible.
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {section.title === 'Marca y preferencias' && (
                <label className="field-label mt-5 max-w-sm">
                  Formato de fecha
                  <select
                    className="field"
                    value={String(data.dateFormat)}
                    onChange={(e) => setData({ ...data, dateFormat: e.target.value })}
                  >
                    <option value="DMY">Día / mes / año</option>
                    <option value="MDY">Mes / día / año</option>
                    <option value="YMD">Año / mes / día</option>
                  </select>
                </label>
              )}
              {section.title === 'Correlativos iniciales' && (
                <p className="mt-4 text-xs leading-5 text-muted">
                  Los números solo pueden avanzar para evitar reutilizar códigos. Se usarán al
                  incorporar los módulos correspondientes.
                </p>
              )}
            </section>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        {editable && (
          <div className="flex justify-end">
            <Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</Button>
          </div>
        )}
      </form>
    </div>
  )
}
