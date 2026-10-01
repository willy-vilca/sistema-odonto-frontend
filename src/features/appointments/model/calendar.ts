export type CalendarView = 'day' | 'week' | 'month' | 'list'
export function dateAdd(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function monthAdd(date: string, months: number) {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}
export function weekStart(date: string) {
  const day = new Date(date + 'T12:00:00Z').getUTCDay()
  return dateAdd(date, -((day + 6) % 7))
}
export function dateRange(date: string, view: CalendarView) {
  const from =
    view === 'month'
      ? weekStart(date.slice(0, 7) + '-01')
      : view === 'week'
        ? weekStart(date)
        : date
  return { from, to: dateAdd(from, view === 'month' ? 41 : view === 'week' ? 6 : 0) }
}
export { clinicToday } from '../../../shared/data/dateFormat'
export function dayTitle(date: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'))
}
