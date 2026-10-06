export interface AgentConfiguration {
  enabled: boolean
  configured: boolean
  workerEnabled: boolean
  provider: string
  model: string
  responseMode: 'PREVIEW'
  missing: string[]
  maxModelCalls: number
  maxCompletionTokens: number
}
export interface AgentRun {
  id: string
  messageId: string
  conversationId: string
  state: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
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
}
export const agentToolLabels: Record<string, string> = {
  consultar_servicios: 'Consultó servicios y precios',
  pacientes_contacto: 'Buscó pacientes de este contacto',
  consultar_horarios: 'Consultó la disponibilidad de la agenda',
  proponer_cita: 'Preparó una propuesta para confirmar',
  descartar_propuesta: 'Descartó la propuesta pendiente',
  crear_cita_confirmada: 'Registró una cita confirmada',
  confirmar_propuesta: 'Comprobó la confirmación',
}
