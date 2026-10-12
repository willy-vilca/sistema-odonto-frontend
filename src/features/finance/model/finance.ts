export interface Charge {
  debt: number | null
  applied: number | null
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'NO_BALANCE' | null
  closed: boolean
  pending: number | null
  id: string
  patientId: string
  planId: string | null
  itemId: string | null
  encounterId: string | null
  originalId: string | null
  kind: string
  description: string
  currency: string
  amount: number
  unitPrice: number | null
  quantity: number | null
  reason: string
  actorName: string
  createdAt: string
}
export const chargePaymentStates = {
  UNPAID: 'Sin pagar',
  PARTIAL: 'Pago parcial',
  PAID: 'Pagado por completo',
  NO_BALANCE: 'Sin deuda',
}
export interface DebtSummary {
  currency: string
  charges: number
  adjustments: number
  netDebt: number
}
export const chargeKinds: Record<string, string> = {
  PLAN: 'Plan aceptado',
  SERVICE: 'Servicio realizado',
  ADJUSTMENT: 'Ajuste',
  CANCELLATION: 'Cancelación',
}
