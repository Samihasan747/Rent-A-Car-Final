export type CarCategory = 'all' | 'sedan' | 'suv' | 'sport' | 'electric'

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc'

export interface DateValidationResult {
  isValid: boolean
  error: string | null
  rentalDays: number
}

/** Returns today's calendar date as yyyy-MM-dd in local time. */
export function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Computes a date offset by a number of calendar days in local time. */
export function getOffsetDateString(daysAhead: number, fromDateString?: string): string {
  let baseDate: Date
  if (fromDateString) {
    const [y, m, d] = fromDateString.split('-').map(Number)
    baseDate = new Date(y, m - 1, d)
  } else {
    baseDate = new Date()
  }
  baseDate.setDate(baseDate.getDate() + daysAhead)
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  const day = String(baseDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculates inclusive rental days: 2026-12-01 to 2026-12-01 is 1 day.
 * Consistent with backend ChronoUnit.DAYS.between(start, end) + 1.
 */
export function calculateRentalDays(startDate: string, endDate: string): number {
  const [sY, sM, sD] = startDate.split('-').map(Number)
  const [eY, eM, eD] = endDate.split('-').map(Number)
  if (!sY || !sM || !sD || !eY || !eM || !eD) {
    return 0
  }
  const startUtc = Date.UTC(sY, sM - 1, sD)
  const endUtc = Date.UTC(eY, eM - 1, eD)
  if (endUtc < startUtc) {
    return 0
  }
  return Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Validates rental date ranges against backend business rules:
 * - Reject past start dates
 * - Require endDate >= startDate
 * - Maximum 30 calendar days
 */
export function validateRentalDates(startDate?: string, endDate?: string): DateValidationResult {
  if (!startDate && !endDate) {
    return { isValid: true, error: null, rentalDays: 0 }
  }

  if (startDate && !endDate) {
    return {
      isValid: false,
      error: 'Please select a return date to complete your search.',
      rentalDays: 0,
    }
  }

  if (!startDate && endDate) {
    return {
      isValid: false,
      error: 'Please select a pickup date.',
      rentalDays: 0,
    }
  }

  const today = getTodayDateString()
  if (startDate! < today) {
    return {
      isValid: false,
      error: 'Pickup date cannot be in the past.',
      rentalDays: 0,
    }
  }

  if (endDate! < startDate!) {
    return {
      isValid: false,
      error: 'Return date must be on or after pickup date.',
      rentalDays: 0,
    }
  }

  const days = calculateRentalDays(startDate!, endDate!)
  if (days > 30) {
    return {
      isValid: false,
      error: 'A rental cannot exceed 30 calendar days.',
      rentalDays: days,
    }
  }

  return { isValid: true, error: null, rentalDays: days }
}

/** Detects the vehicle body style for filtering and badge display. */
export function detectCarCategory(model?: string, name?: string): 'Sedan' | 'SUV' | 'Sport' | 'Electric' | 'Vehicle' {
  const text = `${model ?? ''} ${name ?? ''}`.trim()
  if (/\b(model\s*3|model\s*y|tesla|ev|electric|ioniq|leaf|Seal|Taycan)\b/i.test(text)) return 'Electric'
  if (/\b(m3|m4|m5|rs[3-7]|amg|gt|coupe|supra|mustang|911|C8|Avandedor )\b/i.test(text)) return 'Sport'
  if (/\b(suv|x[1-7]|q[3-8]|rav4|cr-v|tucson|santa\s*fe|Harrier|CV-R|Prado|Pajero Sport)\b/i.test(text)) return 'SUV'
  if (/\b(corolla|civic|a3|a4|sedan|accord|elantra|city|premio|530i|E200)\b/i.test(text)) return 'Sedan'
  return 'Vehicle'
}
