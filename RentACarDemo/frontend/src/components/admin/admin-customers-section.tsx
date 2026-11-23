import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Mail,
  Search,
  User as UserIcon,
} from 'lucide-react'

import { getUsers } from '@/api/admin'
import { getBookingsForAdmin } from '@/api/bookings'
import { getCar } from '@/api/cars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { formatCurrency, formatDate } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import type { Booking, BookingStatus, User } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerStats {
  user: User
  totalBookings: number
  completed: number
  cancelled: number
  confirmed: number
  totalValue: number
}

type SortKey = 'id' | 'name' | 'email' | 'totalBookings' | 'totalValue'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 15

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadge(status: BookingStatus) {
  switch (status) {
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

// ─── Vehicle thumb ────────────────────────────────────────────────────────────

function VehicleThumb({ carId, name, model }: { carId: number; name: string; model: string }) {
  const { data: car } = useQuery({
    queryKey: queryKeys.car(carId),
    queryFn: () => getCar(carId),
    staleTime: 5 * 60 * 1000,
  })
  const src = useCarImage(car?.primaryImageUrl, carImage(model, name))
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <img src={src} alt={`${name} ${model}`} className="h-7 w-auto object-contain" loading="lazy" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{model}</p>
      </div>
    </div>
  )
}

// ─── Customer detail dialog ───────────────────────────────────────────────────

function CustomerDetailDialog({
  customer,
  bookings,
  open,
  onClose,
}: {
  customer: CustomerStats | null
  bookings: Booking[]
  open: boolean
  onClose: () => void
}) {
  if (!customer) return null
  const { user, totalBookings, completed, cancelled, confirmed, totalValue } = customer
  const userBookings = bookings
    .filter((b) => b.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="size-4" aria-hidden="true" />
            {user.name}
          </DialogTitle>
          <DialogDescription>Customer profile and booking history.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Profile */}
          <div className="rounded-lg bg-muted/60 px-4 py-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Customer ID</dt>
              <dd className="font-medium">#{user.id}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{user.name}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{user.email}</dd>
              <dt className="text-muted-foreground">Currently renting</dt>
              <dd className="font-medium">
                {user.bookedCar ? `${user.bookedCar.name} ${user.bookedCar.model}` : '—'}
              </dd>
            </dl>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Total bookings</p>
              <p className="font-heading text-xl font-bold">{totalBookings}</p>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="font-heading text-xl font-bold text-emerald-600 dark:text-emerald-400">{confirmed}</p>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-heading text-xl font-bold">{completed}</p>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="font-heading text-xl font-bold text-red-600 dark:text-red-400">{cancelled}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Total booking value (excl. cancelled): {formatCurrency(totalValue)}
          </p>

          {/* Booking history */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Booking history</h3>
            {userBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">Pickup</th>
                      <th className="px-3 py-2 text-left">Return</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {userBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="px-3 py-2 font-medium tabular-nums">#{b.id}</td>
                        <td className="px-3 py-2">
                          <VehicleThumb carId={b.carId} name={b.carName} model={b.carModel} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatDate(b.startDate)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatDate(b.endDate)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(b.totalPrice)}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className={`ring-1 ${statusBadge(b.status)}`}>
                            {b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function AdminCustomersSection() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [detailTarget, setDetailTarget] = useState<CustomerStats | null>(null)

  const { data: users, isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: getUsers,
  })

  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError } = useQuery({
    queryKey: queryKeys.adminBookings(),
    queryFn: () => getBookingsForAdmin(),
  })

  const isLoading = usersLoading || bookingsLoading
  const isError = usersError || bookingsError

  const stats: CustomerStats[] = useMemo(() => {
    const list = users ?? []
    const allBookings = bookings ?? []
    return list.map((user) => {
      const userBookings = allBookings.filter((b) => b.userId === user.id)
      const completed = userBookings.filter((b) => b.status === 'COMPLETED').length
      const cancelled = userBookings.filter((b) => b.status === 'CANCELLED').length
      const confirmed = userBookings.filter((b) => b.status === 'CONFIRMED').length
      const totalValue = userBookings
        .filter((b) => b.status !== 'CANCELLED')
        .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0)
      return {
        user,
        totalBookings: userBookings.length,
        completed,
        cancelled,
        confirmed,
        totalValue,
      }
    })
  }, [users, bookings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stats
    return stats.filter(
      (c) =>
        String(c.user.id).includes(q) ||
        (c.user.name ?? '').toLowerCase().includes(q) ||
        (c.user.email ?? '').toLowerCase().includes(q),
    )
  }, [stats, search])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = (a.user.name ?? '').localeCompare(b.user.name ?? '')
          break
        case 'email':
          cmp = (a.user.email ?? '').localeCompare(b.user.email ?? '')
          break
        case 'totalBookings':
          cmp = a.totalBookings - b.totalBookings
          break
        case 'totalValue':
          cmp = a.totalValue - b.totalValue
          break
        case 'id':
        default:
          cmp = a.user.id - b.user.id
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
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === 'asc' ? (
        <ChevronUp className="size-3.5" aria-hidden="true" />
      ) : (
        <ChevronDown className="size-3.5" aria-hidden="true" />
      )
    ) : null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search by ID, name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            aria-label="Search customers"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'customer' : 'customers'}
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
            <p className="text-sm text-muted-foreground">Could not load customers.</p>
            <Button variant="outline" size="sm" onClick={() => void refetchUsers()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserIcon className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="font-heading text-base font-semibold">No customers found</p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Try adjusting your search.' : 'There are no registered customers yet.'}
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
                      ID {arrow('id')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('name')}>
                      Name {arrow('name')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('email')}>
                      Email {arrow('email')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('totalBookings')}>
                      Bookings {arrow('totalBookings')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort('totalValue')}>
                      Value {arrow('totalValue')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((c) => (
                  <tr key={c.user.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium tabular-nums">#{c.user.id}</td>
                    <td className="px-3 py-2.5 font-medium">{c.user.name}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Mail className="size-3.5" aria-hidden="true" />
                        {c.user.email}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.totalBookings}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(c.totalValue)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary" className="ring-1 bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400">
                        Active
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View customer ${c.user.id}`}
                          onClick={() => setDetailTarget(c)}
                        >
                          <Search className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      <CustomerDetailDialog
        customer={detailTarget}
        bookings={bookings ?? []}
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  )
}
