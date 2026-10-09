import { useQueryData } from '../../../shared/data/useQueryData'
import { Button } from '../../../shared/ui/Button'
import type { AgentConfiguration } from '../model/agent'

export function AgentConfigurationCard({
  canTest,
  onTest,
}: {
  canTest: boolean
  onTest: () => void
}) {
  const config = useQueryData<AgentConfiguration>('/api/v1/whatsapp/agent/configuration')
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Asistente de reservas</h2>
          <p className="mt-1 text-sm text-muted">
            Interpretación, herramientas y reservas con confirmación.
          </p>
        </div>
        <Button variant="secondary" onClick={config.reload} disabled={config.loading}>
          Actualizar agente
        </Button>
      </div>
      {config.error ? (
        <p role="alert" className="error-box">
          {config.error}
        </p>
      ) : config.loading ? (
        <p role="status">Consultando configuración…</p>
      ) : (
        config.data && (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className={config.data.configured ? 'status-active' : 'status-inactive'}>
                {!config.data.enabled
                  ? 'Agente desactivado'
                  : config.data.configured
                    ? 'Configuración del agente lista'
                    : 'Falta configurar el agente'}
              </span>
              <span>
                {config.data.provider} · {config.data.model}
              </span>
            </div>
            {config.data.missing.length > 0 && (
              <p className="text-sm text-muted">
                Configuración pendiente: {config.data.missing.join(', ')}. Consulta al administrador
                del sistema.
              </p>
            )}
            {!config.data.workerEnabled && (
              <p className="text-sm text-muted">El procesamiento automático está desactivado.</p>
            )}
            <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
              {config.data.responseMode === 'WHATSAPP'
                ? 'El agente responde por WhatsApp, consulta horarios y registra la cita después de confirmar el paciente. Las pruebas desde la aplicación son vistas previas y no envían mensajes al teléfono.'
                : 'Modo de simulación: las respuestas se muestran en la aplicación y no se envían al teléfono.'}
            </p>
            {canTest && (
              <Button onClick={onTest} disabled={!config.data.configured}>
                Abrir simulador del asistente
              </Button>
            )}
          </>
        )
      )}
    </section>
  )
}
