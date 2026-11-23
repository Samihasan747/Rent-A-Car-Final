/** Currency is intentionally centralised so it can be changed in one place. */
const CURRENCY = 'BDT'
const LOCALE = 'en-BD'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDailyPrice(value: number): string {
  return `${formatCurrency(value)} / day`
}

/** Backend dates are ISO calendar dates (yyyy-MM-dd). */
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return value
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function initials(nameOrEmail: string): string {
  const source = nameOrEmail.trim()
  if (!source) {
    return 'V'
  }

  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}
