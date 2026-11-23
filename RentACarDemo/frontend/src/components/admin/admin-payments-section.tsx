import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ChevronLeft, ChevronRight, CreditCard, Search } from 'lucide-react'

import { getAdminPayments } from '@/api/payments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'

type SortKey = 'id' | 'amount' | 'status' | 'initiatedAt'
type SortDir = 'asc' | 'desc'
const PAGE_SIZE = 15

function statusBadge(status: string) {
  switch (status) {
    case 'VALID':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400'
    case 'PENDING':
    case 'INITIATED':
      return 'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-400'
    case 'FAILED':
      return 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400'
    case 'CANCELLED':
    case 'EXPIRED':
      return 'bg-muted text-muted-foreground ring-foreground/10'
    default:
      return ''
  }
}

function refundBadge(status?: string) {
  if (!status || status === 'NONE') return null
  const cls =
    status === 'PENDING' ? 'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-400' :
    status === 'REFUNDED' ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400' :
    status === 'FAILED' ? 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400' :
    'bg-muted text-muted-foreground ring-foreground/10'
  return <Badge variant="secondary" className={`ring-1 ${cls}`}>{status}</Badge>
}

export function AdminPaymentsSection() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('initiatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const { data: payments, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: getAdminPayments,
  })

  const filtered = useMemo(() => {
    if (!payments) return []
    const q = search.trim().toLowerCase()
    let list = payments
    if (statusFilter !== 'ALL') list = list.filter((p) => p.status === statusFilter)
    if (q) {
      list = list.filter(
        (p) =>
          String(p.id).includes(q) ||
          p.tranId.toLowerCase().includes(q) ||
          (p.paymentMethod ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [payments, search, statusFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'id': cmp = a.id - b.id; break
        case 'amount': cmp = a.amount - b.amount; break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'initiatedAt':
        default: cmp = a.initiatedAt.localeCompare(b.initiatedAt); break
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
    else { setSortKey(key); setSortDir('desc') }
  }

  const arrow = (k: SortKey) =>
    sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" placeholder="Search by ID, tran ID or method…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} aria-label="Search payments" />
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            <option value="VALID">Valid</option>
            <option value="PENDING">Pending</option>
            <option value="INITIATED">Initiated</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <p className="text-sm text-muted-foreground">{sorted.length} payments</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Could not load payments.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button>
        </CardContent></Card>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CreditCard className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="font-heading text-base font-semibold">No payments found</p>
          <p className="text-sm text-muted-foreground">{search || statusFilter !== 'ALL' ? 'Try adjusting filters.' : 'No payment records yet.'}</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left"><button className="inline-flex items-center gap-1" onClick={() => toggleSort('id')}>ID {arrow('id')}</button></th>
                  <th className="px-3 py-2.5 text-left">Tran ID</th>
                  <th className="px-3 py-2.5 text-left">Booking</th>
                  <th className="px-3 py-2.5 text-right"><button className="inline-flex items-center gap-1" onClick={() => toggleSort('amount')}>Amount {arrow('amount')}</button></th>
                  <th className="px-3 py-2.5 text-left">Method</th>
                  <th className="px-3 py-2.5 text-left"><button className="inline-flex items-center gap-1" onClick={() => toggleSort('status')}>Status {arrow('status')}</button></th>
                  <th className="px-3 py-2.5 text-left">Refund</th>
                  <th className="px-3 py-2.5 text-left"><button className="inline-flex items-center gap-1" onClick={() => toggleSort('initiatedAt')}>Initiated {arrow('initiatedAt')}</button></th>
                  <th className="px-3 py-2.5 text-left">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium tabular-nums">#{p.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{p.tranId}</td>
                    <td className="px-3 py-2.5 tabular-nums">#{p.bookingId ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(p.amount)}</td>
                    <td className="px-3 py-2.5">{p.paymentMethod ?? '—'}</td>
                    <td className="px-3 py-2.5"><Badge variant="secondary" className={`ring-1 ${statusBadge(p.status)}`}>{p.status}</Badge></td>
                    <td className="px-3 py-2.5">{refundBadge(p.refundStatus)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(p.initiatedAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{p.completedAt ? formatDateTime(p.completedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="size-3.5" aria-hidden="true" /></Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="size-3.5" aria-hidden="true" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}