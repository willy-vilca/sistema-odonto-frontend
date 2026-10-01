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
}
export interface ItemInput {
  serviceId: string | null
  description: string
  tooth: number | null
  quantity: number
  sessions: number
  unitPrice: string
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
}
export function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value)
}
