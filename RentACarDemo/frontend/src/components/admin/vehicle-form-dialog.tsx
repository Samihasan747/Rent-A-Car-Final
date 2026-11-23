import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Loader2 } from 'lucide-react'

import {
  createCar,
  uploadCarImages,
  setPrimaryCarImage,
  deleteCarImage,
} from '@/api/admin'
import { Button } from '@/components/ui/button'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { Car, CarImage, CarRequest } from '@/types/api'

// ─── Image previews ───────────────────────────────────────────────────────────

/** Stored photos require the auth token, so they load through the API client. */
function ExistingImagePreview({
  image,
  alt,
  fallbackSrc,
}: {
  image: CarImage
  alt: string
  fallbackSrc: string
}) {
  const src = useCarImage(image.url, fallbackSrc)
  return <img src={src} alt={alt} className="aspect-square w-full object-cover" />
}

/** Local previews get one object URL per file, revoked when replaced. */
function NewFilePreview({ file, alt }: { file: File; alt: string }) {
  const src = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    return () => URL.revokeObjectURL(src)
  }, [src])

  return <img src={src} alt={alt} className="aspect-square w-full object-cover" />
}

// Zod schema (mirrors CarRequestDto validation)
//
// Backend constraints:
//   name  @NotBlank
//   model @NotBlank
//   price @NotNull, @DecimalMin("0.01"), @Digits(integer=10, fraction=2)

export const vehicleSchema = z.object({
  name: z.string().trim().min(1, 'Make / brand is required'),
  model: z.string().trim().min(1, 'Model is required'),
  price: z
    .string()
    .trim()
    .min(1, 'Daily rate is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Daily rate must be greater than 0')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Daily rate must have at most 2 decimal places'),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>

// Convert schema values to the CarRequest payload (price as number)
export function toCarRequest(values: VehicleFormValues): CarRequest {
  return {
    name: values.name,
    model: values.model,
    price: Number(values.price),
  }
}

interface VehicleFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onClose: () => void
  onSubmit: (values: VehicleFormValues) => void
  isPending: boolean
  apiError: string | null
  /** Pre-fill for edit mode */
  initial?: Car
}

export function VehicleFormDialog({
  mode,
  open,
  onClose,
  onSubmit,
  isPending,
  apiError,
  initial,
}: VehicleFormDialogProps) {
  const isEdit = mode === 'edit'
  const carId = initial?.id ?? null

  const [images, setImages] = useState<CarImage[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [primaryId, setPrimaryId] = useState<number | null>(null)
  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null)

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { name: '', model: '', price: '' },
  })

  // Sync form and image state when dialog opens (edit prefill or create reset)
  useEffect(() => {
    if (open) {
      if (isEdit && initial) {
        form.reset({
          name: initial.name,
          model: initial.model,
          price: String(initial.price),
        })
        const list: CarImage[] = initial.images ?? []
        setImages(list)
        const firstPrimary = list.find((img) => img.primary) ?? list[0] ?? null
        setPrimaryId(firstPrimary ? firstPrimary.id : null)
        setFiles([])
        setRemovedIds([])
        setPrimaryIndex(null)
      } else {
        form.reset({ name: '', model: '', price: '' })
        setImages([])
        setFiles([])
        setRemovedIds([])
        setPrimaryId(null)
        setPrimaryIndex(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initial])

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }

  function removeNewFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPrimaryIndex((prev) => {
      if (prev == null) return prev
      if (prev < index) return prev
      if (prev === index) return null
      return prev - 1
    })
  }

  function requestDeleteExisting(imageId: number) {
    const remaining = images.filter((img) => img.id !== imageId)
    setImages(remaining)
    setRemovedIds((prev) =>
      prev.includes(imageId) ? prev : [...prev, imageId],
    )
    if (primaryId === imageId) {
      setPrimaryId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  async function handleSubmit() {
    const valid = await form.trigger(['name', 'model', 'price'])
    if (!valid) {
      return
    }

    const values: VehicleFormValues = {
      name: form.getValues('name').trim(),
      model: form.getValues('model').trim(),
      price: form.getValues('price').trim(),
    }

    const payload: CarRequest = toCarRequest(values)
    setSubmitting(true)
    setLocalSubmitError(null)

    try {
      if (isEdit && carId != null) {
        for (const imageId of removedIds) {
          await deleteCarImage(carId, imageId)
        }

        let uploaded: CarImage[] = []
        if (files.length > 0) {
          uploaded = await uploadCarImages(carId, files)
        }

        // A newly uploaded photo takes priority; otherwise honour the photo the
        // administrator marked as primary, and let the backend auto-promote
        // when the previous primary was deleted.
        let desiredPrimaryId: number | null = null
        if (uploaded.length > 0) {
          desiredPrimaryId =
            (primaryIndex != null ? uploaded[primaryIndex] : uploaded[0])?.id ??
            uploaded[0].id
        } else if (primaryId != null) {
          desiredPrimaryId = primaryId
        }

        const originalPrimaryId =
          initial?.images?.find((img) => img.primary)?.id ?? null
        if (
          desiredPrimaryId != null &&
          desiredPrimaryId !== originalPrimaryId
        ) {
          await setPrimaryCarImage(carId, desiredPrimaryId)
        }

        onSubmit(values)
      } else {
        const car = await createCar(payload)
        if (files.length > 0) {
          const created = await uploadCarImages(car.id, files)
          const target = primaryIndex != null ? created[primaryIndex] ?? created[0] : created[0]
          await setPrimaryCarImage(car.id, target.id)
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.cars })
        await queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
        await queryClient.invalidateQueries({ queryKey: queryKeys.car(car.id) })
        onClose()
        return
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.cars })
      await queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      if (carId != null) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.car(carId) })
      }
      onClose()
    } catch (error) {
      setLocalSubmitError(
        error instanceof Error ? error.message : 'Failed to save vehicle. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const pending = isPending || submitting
  const displayError = isEdit ? apiError : localSubmitError
  const vehicleFallback = carImage(initial?.model ?? '', initial?.name ?? '')
  const originalPrimaryId =
    initial?.images?.find((img) => img.primary)?.id ??
    initial?.images?.[0]?.id ??
    null
  // Photo edits are not tracked by react-hook-form, so the save button must
  // also react to added files, removed photos and a new primary selection.
  const imagesDirty =
    files.length > 0 ||
    removedIds.length > 0 ||
    primaryId !== originalPrimaryId
  const saveDisabled =
    pending || (isEdit && !form.formState.isDirty && !imagesDirty)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the make, model, price and photos of this vehicle.'
              : 'Enter the new vehicle details and upload photos. All fields are required.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmit()
            }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Photos</p>

              {isEdit && images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="relative overflow-hidden rounded-xl border border-border bg-muted/30"
                    >
                      <ExistingImagePreview
                        image={img}
                        alt={`${initial?.name ?? ''} ${initial?.model ?? ''}`.trim()}
                        fallbackSrc={vehicleFallback}
                      />
                      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryId(img.id)}
                          className="rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-white hover:bg-black/60"
                          aria-label={`Set ${img.url} as primary`}
                        >
                          {img.primary ? 'Primary' : 'Set primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteExisting(img.id)}
                          className="rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/60"
                          aria-label={`Delete ${img.url}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {files.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-border bg-muted/30"
                    >
                      <NewFilePreview
                        file={file}
                        alt={`Preview ${index + 1}`}
                      />
                      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryIndex(primaryIndex === index ? null : index)}
                          className="rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-white hover:bg-black/60"
                          aria-label={`Use preview ${index + 1} as primary`}
                        >
                          {primaryIndex === index ? 'Primary' : 'Set primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          className="rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/60"
                          aria-label={`Remove preview ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <label htmlFor="car-photo-input" className="text-sm font-medium text-foreground">
                  Add photos
                </label>
                <input
                  id="car-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="file:inline-flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2 text-sm text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                  disabled={pending}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make / Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Toyota" disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Corolla" disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily rate (BDT)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 3500.00"
                      disabled={pending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a positive amount with up to 2 decimal places.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {displayError ? (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{displayError}</span>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!submitting) onClose()
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveDisabled}>
                {pending && (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                )}
                {pending ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save changes' : 'Add vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
