import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { http } from '@/lib/http'

/**
 * Resolves a backend vehicle image URL into a value an <img> can render.
 *
 * Vehicle image endpoints live under `/api/cars/**`, which require a Bearer
 * token. A plain `<img src>` cannot carry credentials, so the bytes are fetched
 * through the authenticated axios client and swapped for an object URL before
 * being handed to the DOM. When no image exists (or the request fails) the
 * provided fallback source is used instead.
 *
 * The blob is cached by React Query so several cards showing the same vehicle
 * share a single request, and every object URL is revoked when it is replaced
 * or the component unmounts.
 */
export function useCarImage(
  url: string | null | undefined,
  fallbackSrc: string,
): string {
  const { data: blob } = useQuery({
    queryKey: ['car-image', url ?? null],
    queryFn: async () => {
      const { data } = await http.get<Blob>(url as string, {
        responseType: 'blob',
      })
      return data
    },
    enabled: Boolean(url),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })

  const [src, setSrc] = useState(fallbackSrc)

  useEffect(() => {
    if (!blob) {
      setSrc(fallbackSrc)
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    setSrc(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob, fallbackSrc])

  return src
}
