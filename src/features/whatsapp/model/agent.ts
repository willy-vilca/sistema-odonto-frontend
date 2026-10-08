export interface AgentConfiguration {
  enabled: boolean
  configured: boolean
  workerEnabled: boolean
  provider: string
  model: string
  responseMode: 'PREVIEW' | 'WHATSAPP'
  missing: string[]
  maxModelCalls: number
  maxCompletionTokens: number
}
export interface AgentRun {
  id: string
  messageId: string
  conversationId: string
  state: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'GROUPED' | 'PAUSED'
  model: string
  responseText: string
  errorCode: string | null
  errorMessage: string | null
  attempts: number
  inputTokens: number
  outputTokens: number
  createdAt: string
  updatedAt: string
}
export interface AgentProposal {
  id: string
  summary: string
  confirmationCode: string
  state: string
  appointmentId: string | null
  expiresAt: string
}
export interface AgentDetail {
  run: AgentRun
  incomingText: string
  source: string
  proposal: AgentProposal | null
  reply: WhatsAppMessage | null
  change?: {
    summary: string
    action: string
    appointmentId: string
    state: string
    confirmationCode: string
  } | null
  metadata?: { provider: string; model: string; flow_version: string; operational_result: string }
}
export interface AgentStep {
  id: string
  ordinal: number
  kind: 'MODEL' | 'TOOL' | 'BOOKING'
  name: string
  arguments: unknown
  result: unknown
  state: string
  createdAt: string
}
export const agentStateLabels = {
  QUEUED: 'En cola',
  PROCESSING: 'Analizando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  GROUPED: 'Mensajes agrupados',
  PAUSED: 'Pausado por atención humana',
}
export const agentToolLabels: Record<string, string> = {
  verificar_paciente: 'Verificó el paciente y su relación',
  consultar_mis_citas: 'Consultó citas del paciente verificado',
  proponer_reprogramacion: 'Propuso una reprogramación',
  proponer_cancelacion: 'Propuso una cancelación',
  reprogramar_cita_confirmada: 'Reprogramó la cita confirmada',
  cancelar_cita_confirmada: 'Canceló la cita confirmada',
  derivar_recepcion: 'Derivó la consulta a recepción',
  consultar_servicios: 'Consultó servicios y precios',
  pacientes_contacto: 'Buscó pacientes de este contacto',
  consultar_horarios: 'Consultó la disponibilidad de la agenda',
  proponer_cita: 'Preparó una propuesta para confirmar',
  descartar_propuesta: 'Descartó la propuesta pendiente',
  crear_cita_confirmada: 'Registró una cita confirmada',
  confirmar_propuesta: 'Comprobó la confirmación',
  guardar_respuesta: 'Guardó la respuesta para enviar',
}
import type { WhatsAppMessage } from './whatsapp'
