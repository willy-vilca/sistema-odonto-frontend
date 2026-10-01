export function formatLocalDate(value: string, format = 'DMY') {
  const [year, month, day] = value.split('-')
  return format === 'YMD'
    ? year + '/' + month + '/' + day
    : format === 'MDY'
      ? month + '/' + day + '/' + year
      : day + '/' + month + '/' + year
}
export function dateLocale(format: string) {
  return format === 'MDY' ? 'en-US' : format === 'YMD' ? 'sv-SE' : 'es-PE'
}

export function clinicToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day'].map((type) => parts.find((p) => p.type === type)?.value).join('-')
}
