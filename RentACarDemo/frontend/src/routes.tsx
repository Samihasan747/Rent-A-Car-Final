import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { PublicOnly, RequireAdmin, RequireAuth } from '@/auth/guards'
import { RootLayout } from '@/components/layout/root-layout'

const HomePage = lazy(() =>
  import('@/pages/home-page').then((module) => ({ default: module.HomePage })),
)
const CarsPage = lazy(() =>
  import('@/pages/cars-page').then((module) => ({ default: module.CarsPage })),
)
const CarDetailPage = lazy(() =>
  import('@/pages/car-detail-page').then((module) => ({
    default: module.CarDetailPage,
  })),
)
const LoginPage = lazy(() =>
  import('@/pages/login-page').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/register-page').then((module) => ({
    default: module.RegisterPage,
  })),
)
const AccountPage = lazy(() =>
  import('@/pages/account-page').then((module) => ({
    default: module.AccountPage,
  })),
)
const BookingsPage = lazy(() =>
  import('@/pages/bookings-page').then((module) => ({
    default: module.BookingsPage,
  })),
)
const AdminPage = lazy(() =>
  import('@/pages/admin-page').then((module) => ({ default: module.AdminPage })),
)
const PaymentResultPage = lazy(() =>
  import('@/pages/payment-result-page').then((module) => ({ default: module.PaymentResultPage })),
)
const PaymentsPage = lazy(() =>
  import('@/pages/payments-page').then((module) => ({ default: module.PaymentsPage })),
)
const ForbiddenPage = lazy(() =>
  import('@/pages/forbidden-page').then((module) => ({
    default: module.ForbiddenPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((module) => ({
    default: module.NotFoundPage,
  })),
)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cars" element={<CarsPage />} />
        <Route path="cars/:carId" element={<CarDetailPage />} />

        <Route
          path="login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />

        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="bookings"
          element={
            <RequireAuth>
              <BookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />

        <Route path="payment/success" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
        <Route path="payment/fail" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />
        <Route path="payment/cancel" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />

        <Route
          path="payments"
          element={
            <RequireAuth>
              <PaymentsPage />
            </RequireAuth>
          }
        />

        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
