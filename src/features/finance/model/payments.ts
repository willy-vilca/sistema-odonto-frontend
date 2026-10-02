export interface AccountSummary {
  currency: string
  debt: number
  received: number
  applied: number
  pending: number
  advance: number
}
export interface Movement {
  id: string
  patientId: string | null
  originalId: string | null
  cashSessionId: string | null
  kind: string
  currency: string
  amount: number
  effectiveAmount: number
  applied: number
  available: number
  occurredOn: string
  method: string
  reference: string
  description: string
  supplier: string
  categoryName: string
  actorName: string
  receiptCode: string | null
  createdAt: string
}
export interface OpenCharge {
  id: string
  description: string
  currency: string
  debt: number
  applied: number
  pending: number
}
export interface Allocation {
  chargeId: string
  amount: string
}
export interface FinancialDocument {
  id: string
  movementId: string | null
  patientId: string | null
  fileName: string
  mediaType: string
  byteSize: number
  sha256: string
  description: string
  actorName: string
  generated: boolean
  createdAt: string
}
export interface Application {
  id: string
  paymentId: string
  chargeId: string
  operationId: string
  amount: number
  description: string
  reason: string
  createdAt: string
}
export interface Due {
  id: string
  chargeId: string
  scheduleId: string
  position: number
  dueOn: string
  currency: string
  amount: number
  paid: number
  pending: number
  status: string
  active: boolean
  reason: string
}
export interface Cash {
  id: string
  currency: string
  opening: number
  expected: number
  counted: number | null
  difference: number | null
  nonCashNet: number
  openedBy: string
  closedBy: string | null
  openedAt: string
  closedAt: string | null
  reason: string
}
export const methods: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
}
export const movementKinds: Record<string, string> = {
  PAYMENT: 'Abono',
  REFUND: 'Devolución',
  REVERSAL: 'Reversión de pago',
  EXPENSE: 'Egreso',
  EXPENSE_REVERSAL: 'Reversión de egreso',
}
export const dueStates: Record<string, string> = {
  PAID: 'Pagada',
  PARTIAL: 'Parcial',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  REVIEW: 'Revisar calendario',
  HISTORICAL: 'Calendario anterior',
}
