import { formatLocalDate } from '../../../shared/data/dateFormat'
import { StatusBadge } from '../../../shared/ui/PagedTable'
import {
  dentistSource,
  dayOptions,
  timeLabel,
  timeValue,
  type ResourceDefinition,
} from '../model/resources'
export const periodsResource: ResourceDefinition = {
  endpoint: '/api/v1/schedules/periods',
  title: 'Jornadas y descansos',
  singular: 'horario',
  description:
    'Define los intervalos semanales de trabajo y sus descansos. Los descansos deben quedar dentro de una jornada. Para cambiar profesional o día, desactiva el registro y crea otro.',
  read: 'SCHEDULES_READ',
  write: 'SCHEDULES_WRITE',
  sort: 'day',
  defaults: {
    dentistId: null,
    dayOfWeek: 1,
    kind: 'WORK',
    startMinute: 540,
    endMinute: 1020,
    active: true,
  },
  fields: [
    {
      key: 'dentistId',
      label: 'Odontólogo',
      type: 'picker',
      required: true,
      immutable: true,
      source: dentistSource,
      selected: (r) => [{ id: String(r.dentistId), label: String(r.dentistName) }],
    },
    {
      key: 'dayOfWeek',
      label: 'Día de la semana',
      type: 'select',
      options: dayOptions,
      immutable: true,
    },
    {
      key: 'kind',
      label: 'Tipo de horario',
      type: 'select',
      options: [
        { value: 'WORK', label: 'Jornada de trabajo' },
        { value: 'BREAK', label: 'Descanso' },
      ],
    },
    { key: 'startMinute', label: 'Hora de inicio', type: 'time', required: true },
    { key: 'endMinute', label: 'Hora de fin', type: 'time', required: true },
    { key: 'active', label: 'Horario activo', type: 'checkbox' },
  ],
  prepare: (v) => ({
    ...v,
    dayOfWeek: Number(v.dayOfWeek),
    startMinute: timeValue(v.startMinute),
    endMinute: timeValue(v.endMinute),
  }),
  validate: (v) =>
    !v.dentistId
      ? 'Selecciona un odontólogo.'
      : Number(v.endMinute) <= Number(v.startMinute)
        ? 'La hora de fin debe ser posterior al inicio.'
        : undefined,
  columns: [
    { label: 'Profesional', render: (r) => String(r.dentistName) },
    { label: 'Día', render: (r) => dayOptions[Number(r.dayOfWeek) - 1]?.label },
    { label: 'Tipo', render: (r) => (r.kind === 'WORK' ? 'Jornada' : 'Descanso') },
    {
      label: 'Intervalo',
      render: (r) => timeLabel(r.startMinute) + ' – ' + timeLabel(r.endMinute),
    },
    { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
  ],
}
export function exceptionsResource(dateFormat: string): ResourceDefinition {
  return {
    endpoint: '/api/v1/schedules/exceptions',
    title: 'Días no laborables y ausencias',
    singular: 'bloqueo',
    description:
      'Registra cierres del consultorio o ausencias de un profesional. Sin horas, se bloquean días completos. Con horas, el intervalo debe corresponder a una sola fecha.',
    read: 'SCHEDULES_READ',
    write: 'SCHEDULES_WRITE',
    sort: 'startDate',
    defaults: {
      dentistId: null,
      kind: 'HOLIDAY',
      startDate: '',
      endDate: '',
      startMinute: null,
      endMinute: null,
      reason: '',
      active: true,
    },
    fields: [
      {
        key: 'kind',
        label: 'Tipo de bloqueo',
        type: 'select',
        options: [
          { value: 'HOLIDAY', label: 'Día no laborable' },
          { value: 'ABSENCE', label: 'Ausencia de un odontólogo' },
        ],
      },
      {
        key: 'dentistId',
        label: 'Odontólogo',
        type: 'picker',
        source: dentistSource,
        selected: (r) =>
          r.dentistId ? [{ id: String(r.dentistId), label: String(r.dentistName) }] : [],
      },
      { key: 'startDate', label: 'Fecha inicial', type: 'date', required: true },
      { key: 'endDate', label: 'Fecha final', type: 'date', required: true },
      { key: 'startMinute', label: 'Hora inicial (opcional)', type: 'time' },
      { key: 'endMinute', label: 'Hora final (opcional)', type: 'time' },
      { key: 'reason', label: 'Motivo', type: 'textarea', required: true, maxLength: 200 },
      { key: 'active', label: 'Bloqueo activo', type: 'checkbox' },
    ],
    prepare: (v) => ({
      ...v,
      startMinute: v.startMinute == null || v.startMinute === '' ? null : timeValue(v.startMinute),
      endMinute: v.endMinute == null || v.endMinute === '' ? null : timeValue(v.endMinute),
    }),
    validate: (v) =>
      v.kind === 'ABSENCE' && !v.dentistId
        ? 'Selecciona el profesional ausente.'
        : String(v.endDate) < String(v.startDate)
          ? 'La fecha final debe ser igual o posterior a la inicial.'
          : undefined,
    columns: [
      { label: 'Alcance', render: (r) => String(r.dentistName ?? 'Todo el consultorio') },
      { label: 'Tipo', render: (r) => (r.kind === 'HOLIDAY' ? 'No laborable' : 'Ausencia') },
      {
        label: 'Fechas',
        render: (r) =>
          formatLocalDate(String(r.startDate), dateFormat) +
          ' → ' +
          formatLocalDate(String(r.endDate), dateFormat),
      },
      {
        label: 'Horario',
        render: (r) =>
          r.startMinute == null
            ? 'Días completos'
            : timeLabel(r.startMinute) + ' – ' + timeLabel(r.endMinute),
      },
      { label: 'Motivo', render: (r) => String(r.reason) },
      { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
    ],
  }
}
