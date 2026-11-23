import { http } from '@/lib/http'
import type { Booking, BookingStatus, CreateBookingRequest } from '@/types/api'

export async function createBooking(payload: CreateBookingRequest): Promise<Booking> {
  const { data } = await http.post<Booking>('/api/bookings', payload)
  return data
}

export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await http.get<Booking[]>('/api/bookings/me')
  return data
}

export async function cancelBooking(bookingId: number): Promise<Booking> {
  const { data } = await http.post<Booking>(`/api/bookings/${bookingId}/cancel`)
  return data
}

export interface AdminBookingQuery {
  status?: BookingStatus
}

export async function getBookingsForAdmin(query: AdminBookingQuery = {}): Promise<Booking[]> {
  const { data } = await http.get<Booking[]>('/api/admin/bookings', {
    params: query.status ? { status: query.status } : undefined,
  })
  return data
}

export async function cancelBookingAsAdmin(bookingId: number): Promise<Booking> {
  const { data } = await http.post<Booking>(`/api/admin/bookings/${bookingId}/cancel`)
  return data
}
