import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react'

import {
  cancelBookingAsAdmin,
  getBookingsForAdmin,
} from '@/api/bookings'
import { getCar } from '@/api/cars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { Booking, BookingStatus } from '@/types/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: 'ALL' | BookingStatus; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function statusBadge(status: BookingStatus) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-400'
    case 'CONFIRMED':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400'
    case 'COMPLETED':
      return 'bg-muted text-muted-foreground ring-foreground/10'
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400'
    default:
      return ''
  }
}

type SortKey = 'createdAt' | 'startDate' | 'id' | 'totalPrice'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 15

// ─── Vehicle thumbnail ────────────────────────────────────────────────────────

function VehicleThumb({ carId, name, model }: { carId: number; name: string; model: string }) {
  const { data: car } = useQuery({
    queryKey: queryKeys.car(carId),
    queryFn: () => getCar(carId),
    staleTime: 5 * 60 * 1000,
  })
  const src = useCarImage(car?.primaryImageUrl, carImage(model, name))
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <img
          src={src}
          alt={`${name} ${model}`}
          className="h-8 w-auto object-contain"
          loading="lazy"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{model}</p>
      </div>
    </div>
  )
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function BookingDetailDialog({
  booking,
  open,
  onClose,
}: {
  booking: Booking | null
  open: boolean
  onClose: () => void
}) {
  if (!booking) return null
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4" aria-hidden="true" />
            Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Full reservation details. Created {formatDateTime(booking.createdAt)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
            <VehicleThumb carId={booking.carId} name={booking.carName} model={booking.carModel} />
            <div className="ml-auto">
              <Badge
                variant="secondary"
                className={`ring-1 ${statusBadge(booking.status)}`}
              >
                {booking.status}
              </Badge>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{booking.customerName ?? '—'}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{booking.customerEmail ?? '—'}</dd>
            <dt className="text-muted-foreground">Pickup</dt>
            <dd className="font-medium">{formatDate(booking.startDate)}</dd>
            <dt className="text-muted-foreground">Return</dt>
            <dd className="font-medium">{formatDate(booking.endDate)}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="font-medium">{booking.days} {booking.days === 1 ? 'day' : 'days'}</dd>
            <dt className="text-muted-foreground">Daily rate</dt>
            <dd className="font-medium">{formatCurrency(booking.dailyPrice)}</dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-semibold">{formatCurrency(booking.totalPrice)}</dd>
            {booking.cancelledAt && (
              <>
                <dt className="text-muted-foreground">Cancelled at</dt>
                <dd className="font-medium">{formatDateTime(booking.cancelledAt)}</dd>
              </>
            )}
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cancel confirmation dialog ────────────────────────────────────────────────

function CancelConfirmDialog({
  booking,
  open,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  booking: Booking | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  error: string | null
}) {
  if (!booking) return null
  const vehicleName = [booking.carName, booking.carModel].filter(Boolean).join(' ')
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="size-4" aria-hidden="true" />
            Cancel booking?
          </DialogTitle>
          <DialogDescription>
            Cancel booking #{booking.id}
            {vehicleName ? ` for ${vehicleName}` : ''} for{' '}
            <span className="font-medium">{booking.customerName ?? booking.customerEmail}</span>?
            This releases the reserved dates. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Keep booking
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            {isPending ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function AdminBookingsSection() {
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const [detailTarget, setDetailTarget] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const { data: bookings, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.adminBookings(statusFilter === 'ALL' ? undefined : statusFilter),
    queryFn: () =>
      getBookingsForAdmin({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelBookingAsAdmin(id),
    onMutate: () => setCancelError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      setCancelTarget(null)
    },
    onError: (err) => {
      setCancelError(isApiError(err) ? err.message : 'Cancellation failed. Please try again.')
    },
  })

  const filtered = useMemo(() => {
    if (!bookings) return []
    const q = search.trim().toLowerCase()
    let list = bookings
    if (q) {
      list = list.filter(
        (b) =>
          String(b.id).includes(q) ||
          (b.customerName ?? '').toLowerCase().includes(q) ||
          (b.customerEmail ?? '').toLowerCase().includes(q) ||
          `${b.carName} ${b.carModel}`.toLowerCase().includes(q),
      )
    }
    if (dateFilter) {
      list = list.filter((b) => b.startDate <= dateFilter && b.endDate >= dateFilter)
    }
    return list
  }, [bookings, search, dateFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'id':
          cmp = a.id - b.id
          break
        case 'startDate':
          cmp = a.startDate.localeCompare(b.startDate)
          break
        case 'totalPrice':
          cmp = a.totalPrice - b.totalPrice
          break
        case 'createdAt':
        default:
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
      }
      return cmp * dir
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              className="pl-9"
              placeholder="Search by ID, customer or vehicle…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              aria-label="Search bookings"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | BookingStatus)
                setPage(1)
              }}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <Input
              type="date"
              className="h-9 w-auto"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filter by date"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs"
                onClick={() => setDateFilter('')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'booking' : 'bookings'}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Could not load bookings.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="font-heading text-base font-semibold">No bookings found</p>
            <p className="text-sm text-muted-foreground">
              {search || dateFilter || statusFilter !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'There are no reservations yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('id')}>
                      ID{' '}
                      {sortKey === 'id' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">Customer</th>
                  <th className="px-3 py-2.5 text-left">Vehicle</th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('startDate')}>
                      Pickup{' '}
                      {sortKey === 'startDate' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">Return</th>
                  <th className="px-3 py-2.5 text-right">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('totalPrice')}>
                      Total{' '}
                      {sortKey === 'totalPrice' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('createdAt')}>
                      Created{' '}
                      {sortKey === 'createdAt' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium tabular-nums">#{b.id}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{b.customerName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{b.customerEmail ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <VehicleThumb carId={b.carId} name={b.carName} model={b.carModel} />
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{formatDate(b.startDate)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatDate(b.endDate)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatCurrency(b.totalPrice)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="secondary"
                        className={`ring-1 ${statusBadge(b.status)}`}
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(b.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View booking ${b.id}`}
                          onClick={() => setDetailTarget(b)}
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </Button>
                        {b.status === 'CONFIRMED' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Cancel booking ${b.id}`}
                            onClick={() => {
                              setCancelError(null)
                              setCancelTarget(b)
                            }}
                          >
                            <XCircle className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <BookingDetailDialog
        booking={detailTarget}
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
      />

      <CancelConfirmDialog
        booking={cancelTarget}
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />
    </div>
  )
}
