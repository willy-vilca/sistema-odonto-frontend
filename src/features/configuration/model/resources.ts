import type { Column } from '../../../shared/ui/PagedTable'
import type { PickerSource, PickedEntity } from '../../../shared/ui/EntityPicker'
export interface EntityRow {
  id: string
  version: number
  [key: string]: unknown
}
export interface FieldDefinition {
  key: string
  label: string
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'time'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'multi'
    | 'picker'
  required?: boolean
  min?: number
  max?: number
  maxLength?: number
  step?: number
  hint?: string
  options?: { value: string; label: string }[]
  source?: PickerSource
  multiple?: boolean
  immutable?: boolean
  selected?: (row: EntityRow) => PickedEntity[]
}
export interface ResourceDefinition {
  endpoint: string
  title: string
  singular: string
  description: string
  read: string
  write: string
  defaults: Record<string, unknown>
  fields: FieldDefinition[]
  columns: Column<EntityRow>[]
  sort?: string
  keyFor?: (row: EntityRow) => string
  prepare?: (values: Record<string, unknown>, editing: boolean) => Record<string, unknown>
  validate?: (values: Record<string, unknown>) => string | undefined
}
export const roleOptions = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DENTIST', label: 'Odontólogo' },
  { value: 'RECEPTION', label: 'Recepción' },
  { value: 'CASHIER', label: 'Caja' },
]
export const permissionLabels: Record<string, string> = {
  CLINICAL_READ: 'Consultar expediente clínico',
  CLINICAL_WRITE: 'Registrar atenciones y odontograma',
  DOCUMENTS_READ: 'Consultar y descargar archivos clínicos',
  DOCUMENTS_WRITE: 'Adjuntar archivos y consentimientos',
  CLINICAL_CONFIG_READ: 'Consultar plantillas y configuración clínica',
  CLINICAL_CONFIG_WRITE: 'Editar plantillas y configuración clínica',
  SETTINGS_READ: 'Consultar el consultorio',
  SETTINGS_WRITE: 'Editar el consultorio',
  USERS_READ: 'Consultar usuarios',
  USERS_WRITE: 'Administrar usuarios',
  ROLES_READ: 'Consultar roles',
  ROLES_WRITE: 'Administrar permisos',
  DENTISTS_READ: 'Consultar odontólogos',
  DENTISTS_WRITE: 'Administrar odontólogos',
  SERVICES_READ: 'Consultar servicios y categorías',
  SERVICES_WRITE: 'Administrar servicios y categorías',
  SCHEDULES_READ: 'Consultar horarios y bloqueos',
  SCHEDULES_WRITE: 'Administrar horarios y bloqueos',
  AUDIT_READ: 'Consultar auditoría',
  PATIENTS_READ: 'Consultar pacientes',
  PATIENTS_WRITE: 'Administrar pacientes',
  APPOINTMENTS_READ: 'Consultar agenda',
  APPOINTMENTS_WRITE: 'Administrar citas',
}
export const dentistSource: PickerSource = {
  endpoint: '/api/v1/dentists',
  labelKey: 'fullName',
  filters: { active: 'true' },
}
export const serviceSource: PickerSource = {
  endpoint: '/api/v1/services',
  labelKey: 'name',
  filters: { active: 'true' },
}
export const dayOptions = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
].map((label, i) => ({ value: String(i + 1), label }))
export function timeLabel(minutes: unknown) {
  return (
    String(Math.floor(Number(minutes) / 60)).padStart(2, '0') +
    ':' +
    String(Number(minutes) % 60).padStart(2, '0')
  )
}
export function timeValue(value: unknown) {
  if (typeof value === 'number') return value
  const [h, m] = String(value).split(':').map(Number)
  return h * 60 + m
}
