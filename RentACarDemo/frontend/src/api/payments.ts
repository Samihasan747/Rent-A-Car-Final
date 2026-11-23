import { http } from '@/lib/http'

export interface PaymentDto {
  id: number
  bookingId?: number
  tranId: string
  gatewayTranId?: string
  amount: number
  currency: string
  paymentMethod?: string
  status: string
  refundStatus?: string
  initiatedAt: string
  completedAt?: string | null
}

export async function initiatePayment(bookingId: number): Promise<{ paymentId: number; tranId: string; gatewayUrl: string }> {
  const { data } = await http.post<{ paymentId: number; tranId: string; gatewayUrl: string }>('/api/payments/initiate', { bookingId })
  return data
}

export async function getMyPayments(): Promise<PaymentDto[]> {
  const { data } = await http.get<PaymentDto[]>('/api/payments/me')
  return data
}

export async function getPaymentsForBooking(bookingId: number): Promise<PaymentDto[]> {
  const { data } = await http.get<PaymentDto[]>('/api/payments/booking/' + bookingId)
  return data
}

export async function getAdminPayments(): Promise<PaymentDto[]> {
  const { data } = await http.get<PaymentDto[]>('/api/admin/payments')
  return data
}