import type { BookingStatus } from '@/types/api'

export const queryKeys = {
  cars: ['cars'] as const,
  car: (carId: number) => ['cars', carId] as const,
  availableCars: (startDate?: string, endDate?: string) =>
    ['cars', 'available', startDate ?? null, endDate ?? null] as const,
  carAvailability: (carId: number, startDate: string, endDate: string) =>
    ['cars', carId, 'availability', startDate, endDate] as const,

  account: ['account'] as const,

  bookings: ['bookings'] as const,
  myBookings: ['bookings', 'me'] as const,
  adminBookings: (status?: BookingStatus) =>
    ['admin', 'bookings', status ?? 'ALL'] as const,
  adminUsers: ['admin', 'users'] as const,
}
