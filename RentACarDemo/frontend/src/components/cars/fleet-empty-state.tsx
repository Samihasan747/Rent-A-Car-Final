import { CalendarX2, CarFront, RotateCcw, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

interface FleetEmptyStateProps {
  hasActiveSearch: boolean
  hasDateFilter: boolean
  searchQuery?: string
  startDate?: string
  endDate?: string
  onResetDates: () => void
  onResetSearch: () => void
  onResetAll: () => void
}

export function FleetEmptyState({
  hasActiveSearch,
  hasDateFilter,
  searchQuery,
  startDate,
  endDate,
  onResetDates,
  onResetSearch,
  onResetAll,
}: FleetEmptyStateProps) {
  if (hasDateFilter && startDate && endDate) {
    return (
      <div className="surface-panel mx-auto my-8 max-w-xl p-8 text-center sm:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-muted/60 text-primary shadow-sm">
          <CalendarX2 className="size-7" aria-hidden="true" />
        </div>
        <h3 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          No vehicles available for these dates
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          All cars in our fleet are currently reserved between{' '}
          <span className="font-semibold text-foreground">
            {formatDate(startDate)}
          </span>{' '}
          and{' '}
          <span className="font-semibold text-foreground">
            {formatDate(endDate)}
          </span>
          . Please choose alternative dates or browse the fleet today.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onResetDates} className="gap-2">
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear date filter
          </Button>
          {hasActiveSearch ? (
            <Button variant="outline" onClick={onResetAll}>
              Reset all filters
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  if (hasActiveSearch) {
    return (
      <div className="surface-panel mx-auto my-8 max-w-xl p-8 text-center sm:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-muted/60 text-primary shadow-sm">
          <SearchX className="size-7" aria-hidden="true" />
        </div>
        <h3 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          No vehicles match your search
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {searchQuery ? (
            <>
              No results found for “
              <span className="font-medium text-foreground">{searchQuery}</span>
              ”. Check your spelling or try searching for another brand or model.
            </>
          ) : (
            'No vehicles match the selected category filter.'
          )}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onResetSearch} className="gap-2">
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear search & category
          </Button>
          <Button variant="outline" onClick={onResetAll}>
            Reset all
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-panel mx-auto my-8 max-w-xl p-8 text-center sm:p-12">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-muted/60 text-primary shadow-sm">
        <CarFront className="size-7" aria-hidden="true" />
      </div>
      <h3 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Fleet catalogue is being updated
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        There are currently no vehicles available in the database. Please check back
        shortly or contact support.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onResetAll} variant="outline" className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Refresh catalogue
        </Button>
      </div>
    </div>
  )
}
