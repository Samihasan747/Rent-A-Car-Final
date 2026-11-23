import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Car,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import { createCar, updateCar, deleteCar } from '@/api/admin'
import { getCars } from '@/api/cars'
import {
  VehicleFormDialog,
  toCarRequest,
  type VehicleFormValues,
} from '@/components/admin/vehicle-form-dialog'
import { AdminBookingsSection } from '@/components/admin/admin-bookings-section'
import { AdminCustomersSection } from '@/components/admin/admin-customers-section'
import { AdminOverviewSection } from '@/components/admin/admin-overview-section'
import { AdminPaymentsSection } from '@/components/admin/admin-payments-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { detectCarCategory } from '@/components/cars/types'
import { formatCurrency, formatDailyPrice } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { Car as CarType } from '@/types/api'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function VehicleRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3">
      <Skeleton className="size-14 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
      <Skeleton className="h-4 w-20" />
      <div className="flex gap-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="size-7 rounded-md" />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <VehicleRowSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Empty / error states ─────────────────────────────────────────────────────

function EmptyState({ hasSearch, onAdd }: { hasSearch: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Car className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold">
          {hasSearch ? 'No vehicles match your search' : 'No vehicles in the fleet'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasSearch
            ? 'Try a different search term.'
            : 'Add the first vehicle to get started.'}
        </p>
      </div>
      {!hasSearch && (
        <Button onClick={onAdd} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          Add vehicle
        </Button>
      )}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold">Could not load fleet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          There was a problem fetching vehicle data.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  car: CarType
  open: boolean
  onClose: () => void
}

function DeleteDialog({ car, open, onClose }: DeleteDialogProps) {
  const queryClient = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => deleteCar(car!.id),
    onMutate: () => setApiError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cars })
      void queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      onClose()
    },
    onError: (err) => {
      setApiError(
        isApiError(err)
          ? err.message
          : 'Deletion failed. Please try again.',
      )
    },
  })

  const imgSrc = useCarImage(car.primaryImageUrl, carImage(car.model, car.name))

  function handleClose() {
    if (mutation.isPending) return
    setApiError(null)
    onClose()
  }

  const vehicleName = `${car.name} ${car.model}`.trim()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={!mutation.isPending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
            Delete vehicle?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm">
              <p>
                You are about to permanently delete{' '}
                <span className="font-medium text-foreground">{vehicleName}</span>{' '}
                (ID&nbsp;#{car.id}).
              </p>
              <p className="text-muted-foreground">
                All historical bookings for this vehicle will also be removed.
                This action cannot be undone.
              </p>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Vehicles with active (confirmed) bookings cannot be deleted.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle preview */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
          <img
            src={imgSrc}
            alt={vehicleName}
            className="h-12 w-auto object-contain"
          />
          <div>
            <p className="text-sm font-semibold">{vehicleName}</p>
            <p className="text-xs text-muted-foreground">{formatDailyPrice(car.price)}</p>
          </div>
        </div>

        {apiError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {mutation.isPending ? 'Deleting…' : 'Delete vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Vehicle row ──────────────────────────────────────────────────────────────

interface VehicleRowProps {
  car: CarType
  onEdit: (car: CarType) => void
  onDelete: (car: CarType) => void
}

function VehicleRow({ car, onEdit, onDelete }: VehicleRowProps) {
  const category = detectCarCategory(car.model, car.name)
  const imgSrc = useCarImage(car.primaryImageUrl, carImage(car.model, car.name))
  const vehicleName = `${car.name} ${car.model}`.trim()

  return (
    <div className="group flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm sm:flex-nowrap">
      {/* Thumbnail */}
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <img
          src={imgSrc}
          alt={vehicleName}
          className="h-10 w-auto object-contain"
          loading="lazy"
        />
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-semibold">{vehicleName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">ID #{car.id}</p>
      </div>

      {/* Category badge */}
      <Badge variant="secondary" className="hidden shrink-0 sm:flex">
        {category}
      </Badge>

      {/* Booked status */}
      {car.booked !== undefined && (
        <Badge
          variant={car.booked ? 'destructive' : 'outline'}
          className="shrink-0 text-xs"
        >
          {car.booked ? 'Booked' : 'Available'}
        </Badge>
      )}

      {/* Price */}
      <p className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(car.price)}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">/day</span>
      </p>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(car)}
          aria-label={`Edit ${vehicleName}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(car)}
          aria-label={`Delete ${vehicleName}`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export function AdminPage() {
  const queryClient = useQueryClient()

  // ── State ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<CarType | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CarType | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'fleet' | 'bookings' | 'customers' | 'payments'>('overview')

  // ── Fleet query ──────────────────────────────────────────────────────────
  const { data: cars, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.cars,
    queryFn: getCars,
  })

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!cars) return []
    const q = search.trim().toLowerCase()
    if (!q) return cars
    return cars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q),
    )
  }, [cars, search])

  // ── Create mutation ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: VehicleFormValues) => createCar(toCarRequest(values)),
    onMutate: () => setCreateError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cars })
      void queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      setCreateOpen(false)
    },
    onError: (err) => {
      setCreateError(
        isApiError(err) ? err.message : 'Failed to add vehicle. Please try again.',
      )
    },
  })

  // ── Edit mutation ────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: (values: VehicleFormValues) =>
      updateCar(editTarget!.id, toCarRequest(values)),
    onMutate: () => setEditError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cars })
      void queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      void queryClient.invalidateQueries({
        queryKey: ['cars', editTarget!.id],
        exact: false,
      })
      setEditTarget(null)
    },
    onError: (err) => {
      setEditError(
        isApiError(err) ? err.message : 'Failed to update vehicle. Please try again.',
      )
    },
  })

  // ── Render ───────────────────────────────────────────────────────────────
  const totalCount = cars?.length ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium uppercase tracking-wide">Admin console</span>
          </div>
          <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight">
            {activeTab === 'overview'
              ? 'Overview'
              : activeTab === 'fleet'
                ? 'Fleet management'
                : activeTab === 'bookings'
                  ? 'Booking management'
                  : 'Customer management'}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Manage vehicles and customer bookings.
          </p>
        </div>
        {activeTab === 'fleet' && (
          <Button
            className="shrink-0 gap-2"
            onClick={() => {
              setCreateError(null)
              setCreateOpen(true)
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add vehicle
          </Button>
        )}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'fleet'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Fleet
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bookings'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Bookings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'customers'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Customers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Payments
        </button>
      </div>

      {activeTab === 'overview' && <AdminOverviewSection />}
      {activeTab === 'bookings' && <AdminBookingsSection />}
      {activeTab === 'customers' && <AdminCustomersSection />}
      {activeTab === 'payments' && <AdminPaymentsSection />}

      {activeTab === 'fleet' && (
        <>
      {/* ── Stats strip ─────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Total vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold">{totalCount}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Available today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cars?.filter((c) => !c.booked).length ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card size="sm" className="col-span-2 sm:col-span-1">
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">Booked today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold text-amber-600 dark:text-amber-400">
                {cars?.filter((c) => c.booked).length ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────── */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Search by make or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vehicles"
        />
      </div>

      {/* ── Fleet list ───────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          onAdd={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {search.trim() && (
            <p className="mb-3 text-sm text-muted-foreground">
              Showing {filtered.length} of {totalCount} vehicle{totalCount !== 1 ? 's' : ''}
            </p>
          )}
          {filtered.map((car) => (
            <VehicleRow
              key={car.id}
              car={car}
              onEdit={(c) => {
                setEditError(null)
                setEditTarget(c)
              }}
              onDelete={(c) => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

        </>
      )}

      {/* ── Create dialog ─────────────────────────────────────── */}
      <VehicleFormDialog
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        isPending={createMutation.isPending}
        apiError={createError}
      />

      {/* ── Edit dialog ───────────────────────────────────────── */}
      <VehicleFormDialog
        mode="edit"
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSubmit={(values) => editMutation.mutate(values)}
        isPending={editMutation.isPending}
        apiError={editError}
        initial={editTarget ?? undefined}
      />

      {/* ── Delete dialog ─────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteDialog
          car={deleteTarget}
          open
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
