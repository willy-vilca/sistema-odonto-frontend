import type { PageData } from '../../../shared/data/usePagedList'
export type ReportType =
  | 'APPOINTMENTS'
  | 'ABSENCES'
  | 'TREATMENTS'
  | 'SERVICES'
  | 'COLLECTIONS'
  | 'CHARGES'
  | 'EXPENSES'
  | 'BALANCES'
  | 'INSTALLMENTS'
export interface ReportColumn {
  key: string
  label: string
  kind: 'TEXT' | 'STATE' | 'DATE' | 'DATE_TIME' | 'COUNT' | 'MONEY'
}
export interface ReportDefinition {
  type: ReportType
  title: string
  description: string
  columns: ReportColumn[]
  defaultSort: string
  dentist: boolean
  patient: boolean
  currency: boolean
  method: boolean
  statuses: Record<string, string>
}
export interface ReportCatalog {
  reports: ReportDefinition[]
  currencies: string[]
  canExport: boolean
}
export interface ReportRow {
  id: string
  patientId: string | null
  dentistId: string | null
  entityId: string | null
  documentId: string | null
  state: string
  values: Record<string, string>
}
export interface ReportMetric {
  key: string
  label: string
  kind: 'COUNT' | 'MONEY'
  value: string
  currency: string | null
}
export interface ReportPage extends PageData<ReportRow> {
  totals: ReportMetric[]
  from: string
  to: string
  generatedAt: string
}
export interface Period {
  from: string
  to: string
}
export const paymentMethods = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
}
