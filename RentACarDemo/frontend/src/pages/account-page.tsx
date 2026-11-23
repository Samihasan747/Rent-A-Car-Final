import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react'

import { getMe, updateProfile, deleteAccount } from '@/api/account'
import { useAuth } from '@/auth/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/http'
import { initials } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'

// ─── Zod schema (mirrors UpdateProfileRequestDto constraints) ─────────────────

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(255, 'Name is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
    .pipe(z.email('Enter a valid email address')),
})

type ProfileValues = z.infer<typeof profileSchema>

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <p className="font-heading text-base font-semibold">Could not load profile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            There was a problem fetching your account information.
          </p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Deactivation dialog ──────────────────────────────────────────────────────

interface DeactivateDialogProps {
  open: boolean
  onClose: () => void
  onConfirmed: () => void
  isPending: boolean
  apiError: string | null
}

function DeactivateDialog({ open, onClose, onConfirmed, isPending, apiError }: DeactivateDialogProps) {
  // Second deliberate step: user must type the word "deactivate"
  const [confirmText, setConfirmText] = useState('')
  const REQUIRED_WORD = 'deactivate'
  const isConfirmed = confirmText.trim().toLowerCase() === REQUIRED_WORD

  function handleClose() {
    if (isPending) return
    setConfirmText('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" aria-hidden="true" />
            Deactivate your account?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Deactivating your account will immediately:</p>
              <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                <li>Cancel all your confirmed bookings.</li>
                <li>Mark your account as deactivated.</li>
                <li>Sign you out permanently.</li>
              </ul>
              <p className="font-medium text-foreground">
                This action cannot be undone from the application.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Deliberate second confirmation step */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To confirm, type{' '}
            <span className="font-mono font-semibold text-foreground">{REQUIRED_WORD}</span>{' '}
            below:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={REQUIRED_WORD}
            disabled={isPending}
            aria-label={`Type ${REQUIRED_WORD} to confirm`}
            className="font-mono"
          />
        </div>

        {apiError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmed}
            disabled={!isConfirmed || isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            {isPending ? 'Deactivating…' : 'Deactivate account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AccountPage() {
  const { user: authUser, logout } = useAuth()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateApiError, setUpdateApiError] = useState<string | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateApiError, setDeactivateApiError] = useState<string | null>(null)

  // ── Profile query ────────────────────────────────────────────────────────
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.account,
    queryFn: getMe,
  })

  // ── Edit form ────────────────────────────────────────────────────────────
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '' },
  })

  // Keep form in sync with fetched profile
  useEffect(() => {
    if (profile) {
      form.reset({ name: profile.name, email: profile.email })
    }
  }, [profile, form])

  const updateMutation = useMutation({
    mutationFn: (values: ProfileValues) => updateProfile(values),
    onMutate: () => {
      setUpdateApiError(null)
      setUpdateSuccess(false)
    },
    onSuccess: (updated) => {
      // Update cached profile data
      void queryClient.invalidateQueries({ queryKey: queryKeys.account })
      form.reset({ name: updated.name, email: updated.email })
      setIsEditing(false)
      setUpdateSuccess(true)
      // Clear success banner after 4 s
      setTimeout(() => setUpdateSuccess(false), 4000)
    },
    onError: (err) => {
      const msg = isApiError(err) ? err.message : 'Profile update failed. Please try again.'
      setUpdateApiError(msg)
      // Surface field-level errors from backend if present
      if (isApiError(err) && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          if (field === 'name' || field === 'email') {
            form.setError(field, { message })
          }
        }
      }
    },
  })

  function handleEditCancel() {
    if (profile) {
      form.reset({ name: profile.name, email: profile.email })
    }
    setUpdateApiError(null)
    setIsEditing(false)
  }

  function onSubmit(values: ProfileValues) {
    updateMutation.mutate(values)
  }

  // ── Account deactivation ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onMutate: () => setDeactivateApiError(null),
    onSuccess: () => {
      // Backend returns 204; session must be cleared immediately.
      // logout() calls clearToken(), clears queryClient cache, and navigates to "/".
      logout()
    },
    onError: (err) => {
      setDeactivateApiError(
        isApiError(err) ? err.message : 'Deactivation failed. Please try again.',
      )
    },
  })

  // ── Render ───────────────────────────────────────────────────────────────
  const displayName = profile?.name ?? authUser?.name ?? ''
  const displayEmail = profile?.email ?? authUser?.email ?? ''

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <UserRound className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium uppercase tracking-wide">My account</span>
        </div>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight">
          Profile & settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your name, email, and account status.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Profile card ─────────────────────────────────────────────── */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : isError ? (
          <ProfileError onRetry={() => void refetch()} />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 text-base">
                    <AvatarFallback>{initials(displayName || displayEmail)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{displayName || '—'}</CardTitle>
                    <CardDescription>{displayEmail}</CardDescription>
                    {profile?.id != null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Account #{profile.id}
                      </p>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setUpdateSuccess(false)
                      setUpdateApiError(null)
                      setIsEditing(true)
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Success banner */}
              {updateSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  <span>Profile updated successfully.</span>
                </div>
              )}

              {!isEditing ? (
                /* ── Read-only view ──────────────────────────────────── */
                <dl className="space-y-3 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="text-muted-foreground">Full name</dt>
                    <dd className="font-medium">{profile?.name ?? '—'}</dd>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium break-all">{profile?.email ?? '—'}</dd>
                  </div>
                </dl>
              ) : (
                /* ── Edit form ───────────────────────────────────────── */
                <Form {...form}>
                  <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your name"
                              autoComplete="name"
                              disabled={updateMutation.isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              disabled={updateMutation.isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {updateApiError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>{updateApiError}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending || !form.formState.isDirty}
                      >
                        {updateMutation.isPending && (
                          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                        )}
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleEditCancel}
                        disabled={updateMutation.isPending}
                      >
                        <X className="mr-1.5 size-4" aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Danger zone ──────────────────────────────────────────────── */}
        <Card className="ring-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-4" aria-hidden="true" />
              Danger zone
            </CardTitle>
            <CardDescription>
              Permanent and irreversible actions. Proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Deactivate this account</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All confirmed bookings will be cancelled and your account will be
                    permanently deactivated. You will be signed out immediately.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setDeactivateOpen(true)}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deactivation dialog */}
      <DeactivateDialog
        open={deactivateOpen}
        onClose={() => {
          setDeactivateApiError(null)
          setDeactivateOpen(false)
        }}
        onConfirmed={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        apiError={deactivateApiError}
      />
    </div>
  )
}
