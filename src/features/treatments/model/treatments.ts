export interface Plan {
  id: string
  patientId: string
  dentistId: string
  patientName: string
  dentistName: string
  code: string
  title: string
  conditions: string
  currency: string
  status: string
  acceptedBy: string | null
  acceptedAt: string | null
  originalTotal: number
  currentDebt: number
  completedSessions: number
  totalSessions: number
  version: number
  paymentAgreement: PaymentAgreement
  initialPaymentId: string | null
}
export interface PlanItem {
  id: string
  planId: string
  serviceId: string | null
  serviceName: string
  description: string
  tooth: number | null
  quantity: number
  sessions: number
  unitPrice: number
  amount: number
  completedSessions: number
  currentDebt: number
  label: string
  durationMinutes: number
  scheduling: SessionScheduling
}
export interface ItemInput {
  serviceId: string | null
  description: string
  tooth: number | null
  quantity: number
  sessions: number
  unitPrice: string
  durationMinutes?: number
  scheduling?: SessionScheduling
}
export interface SessionScheduling {
  mode: 'NONE' | 'DATES' | 'FREQUENCY'
  dates: (string | null)[]
  firstDate?: string | null
  interval?: number | null
  unit?: 'DAYS' | 'WEEKS' | 'MONTHS' | null
}
export interface PaymentAgreement {
  initialAmount: number
  installments: { dueOn: string; amount: number }[]
}
export interface AgreementInput {
  initialAmount: string
  installments: { dueOn: string; amount: string }[]
}
export interface ScheduledSession {
  id: string
  planId: string
  planCode: string
  planTitle: string
  itemId: string
  description: string
  tooth: number | null
  serviceId: string | null
  patientId: string
  patientName: string
  dentistId: string
  dentistName: string
  sessionNumber: number
  totalSessions: number
  plannedOn: string | null
  durationMinutes: number
  status: string
  appointmentId: string | null
  version: number
  label: string
}
export interface PlanOperation {
  id: string
  action: string
  reason: string
  actorName: string
  summary: string
  createdAt: string
}
export const planStates: Record<string, string> = {
  DRAFT: 'Borrador',
  PROPOSED: 'Propuesto',
  ACCEPTED: 'Aceptado',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
}
export const emptyItem: ItemInput = {
  serviceId: null,
  description: '',
  tooth: null,
  quantity: 1,
  sessions: 1,
  unitPrice: '0.00',
  durationMinutes: 30,
  scheduling: { mode: 'NONE', dates: [] },
}
export function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value)
}
