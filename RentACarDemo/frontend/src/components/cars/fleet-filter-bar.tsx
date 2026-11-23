import { useId } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'

import {
  type CarCategory,
  type SortOption,
  getOffsetDateString,
  getTodayDateString,
  validateRentalDates,
} from './types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface FleetFilterBarProps {
  startDate: string
  endDate: string
  searchQuery: string
  category: CarCategory
  sortBy: SortOption
  categoryCounts: Record<CarCategory, number>
  onDatesChange: (startDate: string, endDate: string) => void
  onClearDates: () => void
  onSearchChange: (query: string) => void
  onCategoryChange: (category: CarCategory) => void
  onSortChange: (sort: SortOption) => void
  onResetAll: () => void
}

const CATEGORIES: Array<{ key: CarCategory; label: string }> = [
  { key: 'all', label: 'All Fleet' },
  { key: 'sedan', label: 'Sedans' },
  { key: 'suv', label: 'SUVs' },
  { key: 'sport', label: 'Sports' },
  { key: 'electric', label: 'Electric' },
]

export function FleetFilterBar({
  startDate,
  endDate,
  searchQuery,
  category,
  sortBy,
  categoryCounts,
  onDatesChange,
  onClearDates,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onResetAll,
}: FleetFilterBarProps) {
  const startInputId = useId()
  const endInputId = useId()
  const searchInputId = useId()
  const today = getTodayDateString()

  // Validate currently selected dates
  const validation = validateRentalDates(startDate, endDate)
  const isDateFiltering = Boolean(startDate && endDate && validation.isValid)

  // Presets handlers
  function applyPreset(daysCount: number) {
    const start = today
    const end = getOffsetDateString(daysCount - 1, today)
    onDatesChange(start, end)
  }

  function applyWeekendPreset() {
    const current = new Date()
    const dayOfWeek = current.getDay() // 0 = Sun, 5 = Fri, 6 = Sat
    // Days until Friday
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7
    if (daysUntilFriday === 0 && current.getHours() >= 18) {
      daysUntilFriday = 7 // If late Friday, plan for next weekend
    }
    const friday = getOffsetDateString(daysUntilFriday, today)
    const sunday = getOffsetDateString(2, friday)
    onDatesChange(friday, sunday)
  }

  const hasAnyFilter = Boolean(
    startDate || endDate || searchQuery.trim() || category !== 'all' || sortBy !== 'price-asc',
  )

  return (
    <div className="surface-panel mb-8 p-5 sm:p-7">
      {/* 1. Date-range Picker Row */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <CalendarRange className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
                Rental Dates & Availability
              </h2>
              <p className="text-xs text-muted-foreground">
                Select your pickup and return dates (inclusive calendar days, max 30 days)
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            {/* Pickup Date */}
            <div>
              <label
                htmlFor={startInputId}
                className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground"
              >
                <span>Pickup date</span>
                <span className="text-[0.68rem] text-muted-foreground">From 09:00 AM</span>
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id={startInputId}
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value
                    // If return date is before new start date, advance it
                    const newEnd = endDate && endDate < newStart ? newStart : endDate
                    onDatesChange(newStart, newEnd)
                  }}
                  className="h-10 pl-9 font-medium"
                />
              </div>
            </div>

            {/* Return Date */}
            <div>
              <label
                htmlFor={endInputId}
                className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground"
              >
                <span>Return date</span>
                <span className="text-[0.68rem] text-muted-foreground">Until 08:00 PM</span>
              </label>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id={endInputId}
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => onDatesChange(startDate, e.target.value)}
                  className="h-10 pl-9 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Date Presets & Clear */}
        <div className="flex flex-col gap-2">
          <span className="text-[0.72rem] font-medium tracking-wide text-muted-foreground uppercase">
            Quick rental windows
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(1)}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(3)}
              className="text-xs"
            >
              3 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyWeekendPreset}
              className="text-xs"
            >
              Weekend
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(7)}
              className="text-xs"
            >
              1 Week
            </Button>
            {startDate || endDate ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearDates}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 size-3.5" aria-hidden="true" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Date Validation Alert Banner */}
      {!validation.isValid && validation.error ? (
        <div
          role="alert"
          className="my-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{validation.error}</span>
        </div>
      ) : null}

      {/* Active Rental Range Summary */}
      {isDateFiltering ? (
        <div className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>
              Searching fleet available between{' '}
              <span className="font-semibold">{formatDate(startDate)}</span> and{' '}
              <span className="font-semibold">{formatDate(endDate)}</span>
            </span>
          </div>
          <Badge variant="secondary" className="font-semibold tracking-wide">
            <Clock className="mr-1 size-3" aria-hidden="true" />
            {validation.rentalDays} {validation.rentalDays === 1 ? 'inclusive day' : 'inclusive days'}
          </Badge>
        </div>
      ) : null}

      {/* 2. Search, Category Pills & Sort Bar */}
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Vehicle body style">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0
            const isSelected = category === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onCategoryChange(cat.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all focus-ring',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[0.65rem] font-semibold',
                    isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/80 text-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Text Search */}
          <div className="relative min-w-[14rem] flex-1 sm:flex-initial">
            <label htmlFor={searchInputId} className="sr-only">
              Search by make or model
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={searchInputId}
              type="text"
              placeholder="Filter make or model…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pr-8 pl-9 text-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear text search"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort vehicle catalogue"
              className="h-9 rounded-lg border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Vehicle Name: A to Z</option>
            </select>
          </div>

          {/* Reset All Filters Button */}
          {hasAnyFilter ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetAll}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
              title="Reset all search filters"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
