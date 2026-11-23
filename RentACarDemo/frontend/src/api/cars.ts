import { http } from '@/lib/http'
import { toCar } from '@/lib/adapters'
import type { Car, CarAvailability, CarDto, CarImage } from '@/types/api'

export async function getCars(): Promise<Car[]> {
  const { data } = await http.get<CarDto[]>('/api/cars')
  return data.map(toCar)
}

export async function getCar(carId: number): Promise<Car> {
  const { data } = await http.get<CarDto>(`/api/cars/${carId}`)
  return toCar(data)
}

export async function getCarImages(carId: number): Promise<CarImage[]> {
  const { data } = await http.get<CarImage[]>(`/api/cars/${carId}/images`)
  return data
}

/**
 * Without dates the backend returns cars that are free today. With dates it
 * returns cars with no CONFIRMED booking overlapping the inclusive range.
 */
export async function getAvailableCars(startDate?: string, endDate?: string): Promise<Car[]> {
  const { data } = await http.get<CarDto[]>('/api/cars/available', {
    params:
      startDate && endDate
        ? { startDate, endDate }
        : undefined,
  })
  return data.map(toCar)
}

export async function getCarAvailability(
  carId: number,
  startDate: string,
  endDate: string,
): Promise<CarAvailability> {
  const { data } = await http.get<CarAvailability>(`/api/cars/${carId}/availability`, {
    params: { startDate, endDate },
  })
  return data
}
