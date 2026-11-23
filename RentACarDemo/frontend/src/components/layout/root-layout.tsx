import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { AppLayout } from './app-layout'
import { RouteLoader } from '@/components/feedback/route-loader'

export function RootLayout() {
  return (
    <AppLayout>
      <Suspense fallback={<RouteLoader label="Loading page…" />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}
