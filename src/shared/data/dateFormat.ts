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
