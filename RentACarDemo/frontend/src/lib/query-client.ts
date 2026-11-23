import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry authentication, authorization or validation failures.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 1
      },
    },
    mutations: {
      retry: false,
    },
  },
})
