import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarCheck,
  CarFront,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { CarCard } from '@/components/cars/car-card'
import { CarCardSkeleton } from '@/components/cars/car-card-skeleton'
import { FleetEmptyState } from '@/components/cars/fleet-empty-state'
import { FleetFilterBar } from '@/components/cars/fleet-filter-bar'
import {
  type CarCategory,
  type SortOption,
  detectCarCategory,
  validateRentalDates,
} from '@/components/cars/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAvailableCars } from '@/api/cars'
import { isApiError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { Car } from '@/types/api'

export function CarsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial date filters from URL search params
  const urlStart = searchParams.get('startDate') ?? ''
  const urlEnd = searchParams.get('endDate') ?? ''

  const [startDate, setStartDate] = useState(urlStart)
  const [endDate, setEndDate] = useState(urlEnd)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<CarCategory>('all')
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')

  // Validate dates against backend business rules
  const dateValidation = useMemo(
    () => validateRentalDates(startDate, endDate),
    [startDate, endDate],
  )

  // Only pass dates to the backend if both are set and valid
  const queryStartDate =
    startDate && endDate && dateValidation.isValid ? startDate : undefined
  const queryEndDate =
    startDate && endDate && dateValidation.isValid ? endDate : undefined

  // Fetch available cars using existing TanStack Query + API client
  const {
    data: cars = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.availableCars(queryStartDate, queryEndDate),
    queryFn: () => getAvailableCars(queryStartDate, queryEndDate),
  })

  // Synchronize URL search parameters with date state
  function updateDateParams(newStart: string, newEnd: string) {
    setStartDate(newStart)
    setEndDate(newEnd)

    const nextParams = new URLSearchParams(searchParams)
    if (newStart && newEnd) {
      nextParams.set('startDate', newStart)
      nextParams.set('endDate', newEnd)
    } else {
      nextParams.delete('startDate')
      nextParams.delete('endDate')
    }
    setSearchParams(nextParams, { replace: true })
  }

  function handleClearDates() {
    updateDateParams('', '')
  }

  function handleResetAll() {
    updateDateParams('', '')
    setSearchQuery('')
    setCategory('all')
    setSortBy('price-asc')
  }

  // Compute category counts based on fetched fleet
  const categoryCounts = useMemo(() => {
    const counts: Record<CarCategory, number> = {
      all: cars.length,
      sedan: 0,
      suv: 0,
      sport: 0,
      electric: 0,
    }

    for (const car of cars) {
      const cat = detectCarCategory(car.model, car.name).toLowerCase()
      if (cat in counts) {
        counts[cat as CarCategory]++
      }
    }

    return counts
  }, [cars])

  // Filter and sort the vehicle list
  const filteredCars = useMemo(() => {
    let result = [...cars]

    // 1. Category filter
    if (category !== 'all') {
      result = result.filter(
        (car) =>
          detectCarCategory(car.model, car.name).toLowerCase() === category,
      )
    }

    // 2. Search query filter (make, model)
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (normalizedQuery) {
      result = result.filter(
        (car) =>
          car.name.toLowerCase().includes(normalizedQuery) ||
          car.model.toLowerCase().includes(normalizedQuery),
      )
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price
      }
      if (sortBy === 'name-asc') {
        const nameA = `${a.name} ${a.model}`.toLowerCase()
        const nameB = `${b.name} ${b.model}`.toLowerCase()
        return nameA.localeCompare(nameB)
      }
      return 0
    })

    return result
  }, [cars, category, searchQuery, sortBy])

  // Format human-readable error message
  const errorMessage = useMemo(() => {
    if (!isError) return null
    if (isApiError(error)) {
      return error.message
    }
    return 'Unable to load the vehicle catalogue. Check that the backend server is running.'
  }, [isError, error])

  const isDateFiltering = Boolean(queryStartDate && queryEndDate)

  return (
    <div className="relative py-10 lg:py-14">
      {/* Blueprint Grid Background Pattern */}
      <div
        className="velocity-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />

      <div className="container-page relative">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary uppercase"
              >
                <Sparkles className="mr-1 size-3 text-primary" aria-hidden="true" />
                Fleet Catalogue
              </Badge>
              {isFetching && !isLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                  <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                  Updating availability…
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
              Premium vehicles for every journey.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Select your pickup and return dates to inspect live availability. Every
              rental features transparent daily pricing and inclusive calendar windows.
            </p>
          </div>

          {/* Quick Counter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3.5 py-2 text-xs font-medium backdrop-blur">
              <CarFront className="size-4 text-primary" aria-hidden="true" />
              <span>
                <span className="font-semibold text-foreground">
                  {filteredCars.length}
                </span>{' '}
                {filteredCars.length === 1 ? 'vehicle shown' : 'vehicles shown'}
              </span>
            </div>

            {isDateFiltering ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-700 backdrop-blur dark:text-emerald-300">
                <CalendarCheck className="size-4" aria-hidden="true" />
                <span>
                  {dateValidation.rentalDays}{' '}
                  {dateValidation.rentalDays === 1 ? 'day window' : 'days window'}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Filter & Date Selection Bar */}
        <FleetFilterBar
          startDate={startDate}
          endDate={endDate}
          searchQuery={searchQuery}
          category={category}
          sortBy={sortBy}
          categoryCounts={categoryCounts}
          onDatesChange={updateDateParams}
          onClearDates={handleClearDates}
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategory}
          onSortChange={setSortBy}
          onResetAll={handleResetAll}
        />

        {/* Error State with Retry Button */}
        {isError ? (
          <div
            role="alert"
            className="surface-panel mx-auto my-10 max-w-xl border-destructive/40 p-8 text-center"
          >
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-foreground">
              Failed to load catalogue
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {errorMessage}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => refetch()} className="gap-2">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry Search
              </Button>
              <Button variant="outline" onClick={handleResetAll}>
                Reset Dates & Filters
              </Button>
            </div>
          </div>
        ) : null}

        {/* Loading State: Skeletons Grid */}
        {isLoading && !isError ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <CarCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {/* Empty State */}
        {!isLoading && !isError && filteredCars.length === 0 ? (
          <FleetEmptyState
            hasActiveSearch={Boolean(searchQuery.trim() || category !== 'all')}
            hasDateFilter={isDateFiltering}
            searchQuery={searchQuery}
            startDate={queryStartDate}
            endDate={queryEndDate}
            onResetDates={handleClearDates}
            onResetSearch={() => {
              setSearchQuery('')
              setCategory('all')
            }}
            onResetAll={handleResetAll}
          />
        ) : null}

        {/* Success State: Vehicles Grid */}
        {!isLoading && !isError && filteredCars.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCars.map((car: Car) => (
              <CarCard
                key={car.id}
                car={car}
                startDate={queryStartDate}
                endDate={queryEndDate}
                rentalDays={dateValidation.rentalDays}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
