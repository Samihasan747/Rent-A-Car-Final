import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Calendar,
  Car,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react'

import { getCars } from '@/api/cars'
import { getUsers } from '@/api/admin'
import { getBookingsForAdmin } from '@/api/bookings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { detectCarCategory } from '@/components/cars/types'
import type { BookingStatus } from '@/types/api'

// ─── Date range helpers ──────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function periodRange(period: Period, customFrom: string, customTo: string, todayStr: string): { from: string; to: string } {
  const to = todayStr
  const today = new Date(todayStr + 'T00:00:00')
  switch (period) {
    case 'today':
      return { from: to, to }
    case '7d': {
      const f = new Date(today)
      f.setDate(f.getDate() - 6)
      return { from: isoDate(f), to }
    }
    case '30d': {
      const f = new Date(today)
      f.setDate(f.getDate() - 29)
      return { from: isoDate(f), to }
    }
    case 'month': {
      const f = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: isoDate(f), to }
    }
    case 'year': {
      const f = new Date(today.getFullYear(), 0, 1)
      return { from: isoDate(f), to }
    }
    case 'custom':
      return { from: customFrom || to, to: customTo || to }
  }
}

function inRange(dateStr: string, from: string, to: string): boolean {
  return dateStr >= from && dateStr <= to
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  tone?: 'emerald' | 'amber' | 'red' | 'primary'
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'red'
          ? 'text-red-600 dark:text-red-400'
          : 'text-primary'
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <span className={toneCls}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-bold tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Simple bar chart ─────────────────────────────────────────────────────────

function BarChart({
  data,
  valueFormatter,
  emptyLabel,
  height = 160,
}: {
  data: { label: string; value: number }[]
  valueFormatter?: (v: number) => string
  emptyLabel?: string
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel ?? 'No data for this period.'}
      </div>
    )
  }
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * (height - 28))
        return (
          <div key={i} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </span>
            <div
              className="w-full rounded-t-md bg-primary/80 transition-all"
              style={{ height: Math.max(2, h) }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="truncate text-[10px] text-muted-foreground" title={d.label}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const TODAY_STR = isoDate(new Date())

// ─── Main section ─────────────────────────────────────────────────────────────

export function AdminOverviewSection() {
  const [period, setPeriod] = useState<Period>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { data: cars, isLoading: carsLoading, isError: carsError, refetch: refetchCars } = useQuery({
    queryKey: queryKeys.cars,
    queryFn: getCars,
  })
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: getUsers,
  })
  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: queryKeys.adminBookings(),
    queryFn: () => getBookingsForAdmin(),
  })

  const isLoading = carsLoading || usersLoading || bookingsLoading
  const isError = carsError || bookingsError

  const todayStr = TODAY_STR
  const { from, to } = useMemo(
    () => periodRange(period, customFrom, customTo, todayStr),
    [period, customFrom, customTo, todayStr],
  )

  // Filtered bookings by selected period (by createdAt)
  const periodBookings = useMemo(() => {
    if (!bookings) return []
    return bookings.filter((b) => inRange(b.createdAt.slice(0, 10), from, to))
  }, [bookings, from, to])

  // KPIs
  const kpis = useMemo(() => {
    const totalCars = cars?.length ?? 0
    const totalCustomers = users?.length ?? 0
    const totalBookings = periodBookings.length
    const confirmed = periodBookings.filter((b) => b.status === 'CONFIRMED').length
    const completed = periodBookings.filter((b) => b.status === 'COMPLETED').length
    const cancelled = periodBookings.filter((b) => b.status === 'CANCELLED').length
    const completedValue = periodBookings
      .filter((b) => b.status === 'COMPLETED')
      .reduce((s, b) => s + (b.totalPrice ?? 0), 0)
    const totalValue = periodBookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((s, b) => s + (b.totalPrice ?? 0), 0)
    // customers with bookings (all time)
    const customerIds = new Set((bookings ?? []).map((b) => b.userId).filter(Boolean))
    const customersWithBookings = customerIds.size
    const multiBookers = [...customerIds].filter((uid) => (bookings ?? []).filter((b) => b.userId === uid).length > 1).length
    return {
      totalCars,
      totalCustomers,
      totalBookings,
      confirmed,
      completed,
      cancelled,
      completedValue,
      totalValue,
      customersWithBookings,
      multiBookers,
    }
  }, [cars, users, bookings, periodBookings])

  // Fleet analytics
  const fleetAnalytics = useMemo(() => {
    if (!cars || !bookings) return null
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED')
    const activeNow = new Set(
      confirmedBookings
        .filter((b) => b.startDate <= todayStr && b.endDate >= todayStr)
        .map((b) => b.carId),
    )
    const upcoming = new Set(
      confirmedBookings.filter((b) => b.startDate > todayStr).map((b) => b.carId),
    )
    // booking counts per car
    const counts = new Map<number, number>()
    for (const b of bookings) counts.set(b.carId, (counts.get(b.carId) ?? 0) + 1)
    const mostBooked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([carId, count]) => {
        const car = cars.find((c) => c.id === carId)
        return { carId, name: car ? `${car.name} ${car.model}` : `Car #${carId}`, count }
      })
    // completed value per car
    const valueByCar = new Map<number, number>()
    for (const b of bookings) {
      if (b.status === 'COMPLETED') {
        valueByCar.set(b.carId, (valueByCar.get(b.carId) ?? 0) + (b.totalPrice ?? 0))
      }
    }
    const topCarsByValue = [...valueByCar.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([carId, value]) => {
        const car = cars.find((c) => c.id === carId)
        return { carId, name: car ? `${car.name} ${car.model}` : `Car #${carId}`, value }
      })
    // category distribution (frontend-detected)
    const catCounts = new Map<string, number>()
    for (const c of cars) {
      const cat = detectCarCategory(c.model, c.name)
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1)
    }
    const categoryDist = [...catCounts.entries()].map(([label, value]) => ({ label, value }))
    return { activeNow: activeNow.size, upcoming: upcoming.size, mostBooked, topCarsByValue, categoryDist }
  }, [cars, bookings, todayStr])

  // Monthly trend data (by month of createdAt) for last 12 months, respecting period? Use selected range's months.
  const monthlyTrend = useMemo(() => {
    if (!bookings) return { labels: [] as string[], counts: [] as number[], values: [] as number[] }
    // determine month buckets within [from,to]
    const start = new Date(from)
    const end = new Date(to)
    // if range <= 31 days, bucket by day
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    if (days <= 31) {
      const buckets = new Map<string, { count: number; value: number }>()
      const cur = new Date(start)
      while (cur <= end) {
        buckets.set(isoDate(cur), { count: 0, value: 0 })
        cur.setDate(cur.getDate() + 1)
      }
      for (const b of bookings) {
        const d = b.createdAt.slice(0, 10)
        if (buckets.has(d)) {
          const v = buckets.get(d)!
          v.count += 1
          if (b.status === 'COMPLETED') v.value += b.totalPrice ?? 0
        }
      }
      const labels = [...buckets.keys()].map((d) => d.slice(5)) // MM-DD
      const counts = [...buckets.values()].map((v) => v.count)
      const values = [...buckets.values()].map((v) => v.value)
      return { labels, counts, values, byDay: true }
    }
    // else by month
    const months = new Map<string, { count: number; value: number }>()
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur <= last) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      months.set(key, { count: 0, value: 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
    for (const b of bookings) {
      const d = b.createdAt.slice(0, 7)
      if (months.has(d)) {
        const v = months.get(d)!
        v.count += 1
        if (b.status === 'COMPLETED') v.value += b.totalPrice ?? 0
      }
    }
    const labels = [...months.keys()].map((k) => k.slice(5)) // MM
    const counts = [...months.values()].map((v) => v.count)
    const values = [...months.values()].map((v) => v.value)
    return { labels, counts, values, byDay: false }
  }, [bookings, from, to])

  // Status distribution for period
  const statusDist = useMemo(() => {
    const counts: Record<BookingStatus, number> = { PENDING_PAYMENT: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, EXPIRED: 0 }
    for (const b of periodBookings) counts[b.status]++
    return (['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'] as BookingStatus[]).map((s) => ({ label: s, value: counts[s] }))
  }, [periodBookings])

  // Top customers by completed value (all time)
  const topCustomers = useMemo(() => {
    if (!users || !bookings) return []
    const valueByUser = new Map<number, { value: number; count: number }>()
    for (const b of bookings) {
      if (b.status !== 'COMPLETED') continue
      const uid = b.userId
      if (!uid) continue
      const v = valueByUser.get(uid) ?? { value: 0, count: 0 }
      v.value += b.totalPrice ?? 0
      v.count += 1
      valueByUser.set(uid, v)
    }
    return [...valueByUser.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5)
      .map(([uid, v]) => {
        const u = users.find((x) => x.id === uid)
        return { userId: uid, name: u?.name ?? `User #${uid}`, email: u?.email ?? '', value: v.value, count: v.count }
      })
  }, [users, bookings])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Loader2 className="size-6 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Could not load analytics data.</p>
          <Button variant="outline" size="sm" onClick={() => { void refetchCars(); void refetchBookings() }}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const periodLabel =
    period === 'today' ? 'Today' :
    period === '7d' ? 'Last 7 days' :
    period === '30d' ? 'Last 30 days' :
    period === 'month' ? 'This month' :
    period === 'year' ? 'This year' : 'Custom range'

  return (
    <div className="space-y-6">
      {/* Header + date filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Business overview</h2>
          <p className="text-sm text-muted-foreground">
            All metrics based on booking creation date. Monetary values are completed rental value (not collected revenue).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label="Reporting period"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>
          {period === 'custom' && (
            <>
              <Input type="date" className="h-9 w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From date" />
              <Input type="date" className="h-9 w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="To date" />
            </>
          )}
          <span className="text-xs text-muted-foreground">{periodLabel}: {from} → {to}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total vehicles" value={kpis.totalCars} icon={<Car className="size-5" aria-hidden="true" />} />
        <KpiCard label="Total customers" value={kpis.totalCustomers} icon={<Users className="size-5" aria-hidden="true" />} />
        <KpiCard label="Total bookings" value={kpis.totalBookings} sub={periodLabel} icon={<Calendar className="size-5" aria-hidden="true" />} />
        <KpiCard label="Confirmed" value={kpis.confirmed} tone="emerald" icon={<TrendingUp className="size-5" aria-hidden="true" />} />
        <KpiCard label="Completed" value={kpis.completed} icon={<BarChart3 className="size-5" aria-hidden="true" />} />
        <KpiCard label="Cancelled" value={kpis.cancelled} tone="red" icon={<TrendingUp className="size-5" aria-hidden="true" />} />
        <KpiCard label="Completed rental value" value={formatCurrency(kpis.completedValue)} sub="excl. cancelled" icon={<TrendingUp className="size-5" aria-hidden="true" />} tone="emerald" />
        <KpiCard label="Non-cancelled value" value={formatCurrency(kpis.totalValue)} sub="confirmed + completed" icon={<TrendingUp className="size-5" aria-hidden="true" />} />
      </div>

      {/* Customer analytics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Customer analytics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total customers</p>
            <p className="font-heading text-xl font-bold">{kpis.totalCustomers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With bookings</p>
            <p className="font-heading text-xl font-bold">{kpis.customersWithBookings}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Repeat customers</p>
            <p className="font-heading text-xl font-bold">{kpis.multiBookers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg bookings/customer</p>
            <p className="font-heading text-xl font-bold">
              {kpis.totalCustomers > 0 ? (kpis.totalBookings / kpis.totalCustomers).toFixed(1) : '0'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Bookings over time</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              data={monthlyTrend.labels.map((l, i) => ({ label: l, value: monthlyTrend.counts[i] }))}
              emptyLabel="No bookings in this period."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Completed rental value over time</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              data={monthlyTrend.labels.map((l, i) => ({ label: l, value: monthlyTrend.values[i] }))}
              valueFormatter={(v) => formatCurrency(v)}
              emptyLabel="No completed rentals in this period."
            />
          </CardContent>
        </Card>
      </div>

      {/* Status distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">Booking status distribution ({periodLabel})</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={statusDist} emptyLabel="No bookings in this period." />
        </CardContent>
      </Card>

      {/* Fleet analytics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Fleet analytics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Fleet size</p>
              <p className="font-heading text-xl font-bold">{kpis.totalCars}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">With active rentals today</p>
              <p className="font-heading text-xl font-bold">{fleetAnalytics?.activeNow ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">With upcoming bookings</p>
              <p className="font-heading text-xl font-bold">{fleetAnalytics?.upcoming ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available (no confirmed booking today)</p>
              <p className="font-heading text-xl font-bold">{kpis.totalCars - (fleetAnalytics?.activeNow ?? 0)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Vehicle distribution by category</p>
            <BarChart data={fleetAnalytics?.categoryDist ?? []} emptyLabel="No vehicles." />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Most booked vehicles</p>
              {fleetAnalytics && fleetAnalytics.mostBooked.length > 0 ? (
                <ul className="space-y-1.5">
                  {fleetAnalytics.mostBooked.map((v) => (
                    <li key={v.carId} className="flex items-center justify-between text-sm">
                      <span className="truncate">{v.name}</span>
                      <Badge variant="secondary">{v.count} bookings</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No booking data.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Top vehicles by completed rental value</p>
              {fleetAnalytics && fleetAnalytics.topCarsByValue.length > 0 ? (
                <ul className="space-y-1.5">
                  {fleetAnalytics.topCarsByValue.map((v) => (
                    <li key={v.carId} className="flex items-center justify-between text-sm">
                      <span className="truncate">{v.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(v.value)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No completed rentals yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top customers */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top customers by completed rental value</CardTitle></CardHeader>
        <CardContent>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed rentals yet.</p>
          ) : (
            <ul className="space-y-2">
              {topCustomers.map((c) => (
                <li key={c.userId} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{formatCurrency(c.value)}</p>
                    <p className="text-xs text-muted-foreground">{c.count} completed</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
