/** Formats decimal strings without converting the monetary value to floating point. */
export function decimalMoney(value: string, currency: string) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) return currency + ' ' + value
  const integer = BigInt((match[1] || '') + match[2])
  const negativeZero = match[1] === '-' && integer === 0n
  try {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .formatToParts(negativeZero ? -1n : integer)
      .map((part) =>
        part.type === 'fraction'
          ? (match[3] || '').padEnd(2, '0').slice(0, 2)
          : part.type === 'integer' && negativeZero
            ? '0'
            : part.value,
      )
      .join('')
  } catch {
    return currency + ' ' + value
  }
}
