import { dateLocale } from '../../../shared/data/dateFormat'

export interface WhatsAppConnection {
  enabled: boolean
  configured: boolean
  provider: 'TWILIO_SANDBOX' | 'KAPSO_SANDBOX'
  sender: string
  inboundUrl: string
  statusUrl: string
  allowedParticipantsCount: number
  sendMode: 'TEMPLATE' | 'TEXT'
  testTemplateConfigured: boolean
  missing: string[]
  agentEnabled: boolean
}

export interface WhatsAppConversation {
  mode?: string
  requestState?: string
  patientName?: string
  summary?: string
  appointmentId?: string | null
  id: string
  phone: string
  contactName: string | null
  lastMessageAt: string
  lastInboundAt: string | null
  lastMessagePreview: string | null
}

export const messageStatusLabels = {
  QUEUED: 'En cola',
  SENDING: 'Enviando',
  ACCEPTED: 'Aceptado por el proveedor',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  READ: 'Leído',
  FAILED: 'Falló el envío',
  UNKNOWN: 'Resultado por verificar',
  RECEIVED: 'Recibido',
  UNSUPPORTED: 'Formato no admitido',
} as const

export type MessageStatus = keyof typeof messageStatusLabels
export interface WhatsAppMessage {
  id: string
  conversationId: string
  direction: 'INBOUND' | 'OUTBOUND'
  kind: 'TEXT' | 'TEMPLATE' | 'UNSUPPORTED'
  body: string
  providerSid: string | null
  status: MessageStatus
  createdAt: string
  errorCode: string | null
  errorMessage: string | null
  attempts: number
  source: 'TWILIO' | 'KAPSO' | 'APP_TEST' | 'AGENT'
}

export function messageDate(value: string, timeZone: string, dateFormat: string) {
  return new Intl.DateTimeFormat(dateLocale(dateFormat), {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}
