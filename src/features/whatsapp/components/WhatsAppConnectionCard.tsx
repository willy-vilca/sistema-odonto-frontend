import { CheckCircle2, CircleAlert, Link2 } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useQueryData } from '../../../shared/data/useQueryData'
import type { WhatsAppConnection } from '../model/whatsapp'

export function WhatsAppConnectionCard({
  connection,
  canConfigure,
}: {
  connection: ReturnType<typeof useQueryData<WhatsAppConnection>>
  canConfigure: boolean
}) {
  const config = connection.data
  return (
    <section
      aria-label="Conexión de WhatsApp"
      className="rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-3 text-brand-700">
            <Link2 size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Conexión de prueba</h2>
            <p className="mt-1 text-sm text-muted">Twilio Sandbox para WhatsApp</p>
          </div>
        </div>
        <Button variant="secondary" onClick={connection.reload} disabled={connection.loading}>
          Actualizar conexión
        </Button>
      </div>
      {connection.error ? (
        <p role="alert" className="error-box mt-4">
          {connection.error}
        </p>
      ) : connection.loading ? (
        <p role="status" className="mt-4 text-sm text-muted">
          Consultando configuración…
        </p>
      ) : config ? (
        <div className="mt-5 space-y-4">
          <p className="flex items-start gap-2 text-sm font-medium">
            {config.enabled && config.configured ? (
              <CheckCircle2 size={18} className="shrink-0 text-brand-700" aria-hidden="true" />
            ) : (
              <CircleAlert size={18} className="shrink-0 text-muted" aria-hidden="true" />
            )}
            {config.enabled && config.configured
              ? 'Configuración lista para la prueba'
              : config.enabled
                ? 'Pendiente de configuración'
                : 'Conexión desactivada'}
          </p>
          <p className="text-sm text-muted">
            {config.enabled && config.configured
              ? 'Comprueba la recepción enviando un mensaje desde un participante autorizado. Luego actualiza las conversaciones.'
              : 'El administrador debe completar la conexión y autorizar los teléfonos que participarán en la prueba.'}
          </p>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Número de prueba</dt>
              <dd className="mt-1 break-all font-medium">{config.sender || 'Sin configurar'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Participantes autorizados</dt>
              <dd className="mt-1 font-medium">{config.allowedParticipantsCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Respuesta de prueba</dt>
              <dd className="mt-1 font-medium">
                {config.sendMode === 'TEMPLATE' ? 'Plantilla de Twilio' : 'Mensaje de texto'}
              </dd>
            </div>
          </dl>
          {config.sendMode === 'TEMPLATE' && !config.testTemplateConfigured && (
            <p className="text-sm text-muted">
              Falta configurar la plantilla para probar el envío de respuestas.
            </p>
          )}
          {canConfigure && config.missing.length > 0 && (
            <div className="rounded-xl bg-canvas p-4 text-sm">
              <p className="font-semibold">Configuración pendiente</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted">
                {config.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {canConfigure && (config.inboundUrl || config.statusUrl) && (
            <details className="rounded-xl border border-line p-4 text-sm">
              <summary className="min-h-11 cursor-pointer font-semibold text-brand-700">
                Direcciones para configurar en Twilio
              </summary>
              <dl className="mt-2 space-y-3">
                <div>
                  <dt className="font-medium">Recepción de mensajes</dt>
                  <dd className="mt-1 break-all text-muted">
                    {config.inboundUrl || 'Sin configurar'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Estados de envío</dt>
                  <dd className="mt-1 break-all text-muted">
                    {config.statusUrl || 'Sin configurar'}
                  </dd>
                </div>
              </dl>
            </details>
          )}
        </div>
      ) : null}
    </section>
  )
}
