import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/auth/auth-provider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { queryClient } from '@/lib/query-client'
import { AppRoutes } from '@/routes'

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
