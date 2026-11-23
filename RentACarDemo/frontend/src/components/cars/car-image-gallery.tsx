import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCarImage } from '@/lib/use-car-image'
import type { CarImage } from '@/types/api'

interface CarImageGalleryProps {
  images: CarImage[]
  fallbackSrc: string
  alt?: string
  /** Content rendered below the image inside the gallery panel. */
  children?: React.ReactNode
}

export function CarImageGallery({ images, fallbackSrc, alt, children }: CarImageGalleryProps) {
  const imagesList = images ?? []
  const hasImages = imagesList.length > 0
  const [userSelected, setUserSelected] = useState<number | null>(null)

  const primary = hasImages && imagesList.length > 0 ? imagesList.find((img) => img.primary) ?? imagesList[0] : null
  const activeIndex = primary ? imagesList.indexOf(primary) : 0
  const selectedIndex =
    userSelected != null && userSelected >= 0 && userSelected < imagesList.length ? userSelected : activeIndex
  const selected = hasImages && imagesList.length > 0 ? imagesList[selectedIndex] ?? imagesList[0] : null
  const src = useCarImage(selected?.url ?? null, fallbackSrc)

  const goPrev = () => {
    if (!hasImages) return
    setUserSelected((prev) => (prev == null ? imagesList.length - 1 : (prev - 1 + imagesList.length) % imagesList.length))
  }

  const goNext = () => {
    if (!hasImages) return
    setUserSelected((prev) => (prev == null ? 0 : (prev + 1) % imagesList.length))
  }

  return (
    <div className="surface-panel relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-muted/40 to-card p-6 sm:p-10">
      <div className="velocity-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[16rem] items-center justify-center sm:min-h-[22rem]">
        <img
          src={src}
          alt={alt ?? 'Vehicle photo'}
          className="max-h-[18rem] w-auto max-w-full object-contain drop-shadow-[0_24px_36px_rgba(15,23,42,0.24)] sm:max-h-[22rem]"
        />
      </div>

      {hasImages && imagesList.length > 1 ? (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full bg-background/90 backdrop-blur"
            onClick={goPrev}
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-full bg-background/90 backdrop-blur"
            onClick={goNext}
            aria-label="Next photo"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {children ? <div className="relative z-10 mt-6">{children}</div> : null}
    </div>
  )
}
