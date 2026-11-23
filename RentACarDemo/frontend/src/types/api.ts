/**
 * TypeScript mirrors of the backend contracts.
 *
 * Two deliberate quirks are captured here:
 *  - CarRespondDto serialises its id as "Id" (capital I).
 *  - UserResponseDto.bookedCar is the raw Cars entity, which serialises as "id".
 * Both are normalised by the adapters in src/lib/adapters.ts before the rest of
 * the application sees them.
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface CarDto {
  Id: number
  name: string
  model: string
  booked: boolean | null
  price: number
  primaryImageUrl?: string | null
  images?: CarImageDto[]
}

export interface CarImageDto {
  id: number
  url: string
  primary: boolean
  contentType: string
  sizeBytes: number
  sortOrder: number
}

export type CarImage = CarImageDto

export interface BookedCarDto {
  id: number
  name: string
  model: string
  booked: boolean | null
  price: number
}

export interface Car {
  id: number
  name: string
  model: string
  booked: boolean
  price: number
  primaryImageUrl?: string | null
  images?: CarImageDto[]
}

export interface UserDto {
  id: number
  name: string
  email: string
  bookedCar: BookedCarDto | null
}

export interface User {
  id: number
  name: string
  email: string
  bookedCar: Car | null
}

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED'

export interface Booking {
  id: number
  userId?: number
  customerName?: string
  customerEmail?: string
  carId: number
  carName: string
  carModel: string
  startDate: string
  endDate: string
  days: number
  dailyPrice: number
  totalPrice: number
  status: BookingStatus
  createdAt: string
  cancelledAt: string | null
}

export interface CreateBookingRequest {
  carId: number
  startDate: string
  endDate: string
}

export interface CarAvailability {
  carId: number
  startDate: string
  endDate: string
  available: boolean
}

export interface CarRequest {
  name: string
  model: string
  price: number
}

export interface UpdateProfileRequest {
  name: string
  email: string
}

/** Controller advice and security handlers. */
export interface ApiErrorBody {
  timespan?: string
  timestamp?: string
  statusCode?: number
  status?: number
  error: string
  message: string
  path: string
}

/** Bean-validation failures. */
export interface ValidationErrorBody extends ApiErrorBody {
  fieldErrors: Record<string, string>
}
