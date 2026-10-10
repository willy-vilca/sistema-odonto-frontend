import type { ReportMetric } from '../../reports/model/reports'
export interface CashPoint {
  date: string
  collections: string
  expenses: string
}
export interface PeriodMoney {
  currency: string
  received: string
  returned: string
  collections: string
  expenses: string
  net: string
  movements: number
  trend: CashPoint[]
  granularity: string
}
export interface Dashboard {
  today: string
  day: string
  from: string
  to: string
  timeZone: string
  updatedAt: string
  appointments: {
    total: number
    waiting: number
    inProgress: number
    attended: number
    cancelled: number
    noShow: number
  } | null
  conversations: { pending: number; human: number } | null
  money: PeriodMoney[] | null
  overdue: ReportMetric[] | null
  balances: ReportMetric[] | null
}
