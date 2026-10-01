import { Check, CircleAlert, Database, RefreshCw } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import type { InstallationState } from '../model/installation'
export function ConnectionCard({
  state,
  reload,
}: {
  state: InstallationState
  reload: () => void
}) {
  return (
    <section
      aria-labelledby="connection-title"
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">
            Tu instalación
          </p>
          <h2 id="connection-title" className="text-lg font-semibold">
            Todo empieza con una buena base
          </h2>
        </div>
        <span className="rounded-xl bg-canvas p-2.5 text-brand-700">
          <Database size={21} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5" aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div role="status" className="space-y-3">
            <p className="text-sm text-muted">Comprobando la conexión del consultorio…</p>
            <div aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-canvas" />
          </div>
        )}
        {state.status === 'ready' && (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-3 text-sm font-medium text-brand-700">
              <Check size={18} aria-hidden="true" />
              Información del consultorio disponible
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Consultorio</dt>
                <dd className="mt-1 break-words font-medium">{state.data.displayName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Zona horaria y moneda</dt>
                <dd className="mt-1 break-words font-medium">
                  {state.data.timeZone} · {state.data.currency}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              Estos datos se consultan en la instalación. Podrás personalizarlos desde Configuración
              en la siguiente fase.
            </p>
          </>
        )}
        {state.status === 'error' && (
          <div role="alert">
            <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">No pudimos conectar</p>
                <p className="mt-1 text-sm leading-6">
                  Comprueba que el sistema esté iniciado y vuelve a intentarlo.
                </p>
                {state.requestId && (
                  <p className="mt-2 break-all text-xs">Referencia: {state.requestId}</p>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={reload} className="mt-4">
              <RefreshCw size={16} aria-hidden="true" />
              Reintentar conexión
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
