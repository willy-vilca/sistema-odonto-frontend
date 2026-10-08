export interface AgentPeriod {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}
export interface AgentPolicy {
  version: number
  enabled: boolean
  schedule: AgentPeriod[]
  changeLeadMinutes: number
  allowReschedule: boolean
  allowCancel: boolean
  handoffText: string
  clinicalText: string
  closedText: string
  failureText: string
}
export interface Supervision {
  conversationId: string
  mode: string
  generation: number
  assignedName: string | null
  reason: string
  source: string
  requestState: string
  summary: string
  patientId: string | null
  patientName: string
  appointmentId: string | null
}
export const controlLabels: Record<string, string> = {
  AUTO: 'Agente activo',
  HUMAN: 'Atención humana',
  HANDOFF: 'Pendiente de recepción',
  CLOSED: 'Cerrada',
}
export const requestLabels: Record<string, string> = {
  INFORMATION_PENDING: 'Datos pendientes',
  OPTIONS_OFFERED: 'Horarios ofrecidos',
  CONFIRMATION_PENDING: 'Por confirmar',
  COMPLETED: 'Solicitud completada',
  EXPIRED: 'Propuesta vencida',
  REFERRED: 'Derivada a recepción',
}
