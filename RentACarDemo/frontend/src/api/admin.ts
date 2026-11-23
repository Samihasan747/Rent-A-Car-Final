import { http } from '@/lib/http'
import { toCar, toUser } from '@/lib/adapters'
import type { Car, CarDto, CarImage, CarRequest, User, UserDto } from '@/types/api'

export async function getUsers(): Promise<User[]> {
  const { data } = await http.get<UserDto[]>('/api/admin/user/all')
  return data.map(toUser)
}

export async function deleteUser(userId: number): Promise<void> {
  await http.delete(`/api/admin/user/${userId}`)
}

export async function createCar(payload: CarRequest): Promise<Car> {
  const { data } = await http.post<CarDto>('/api/admin/cars/add', payload)
  return toCar(data)
}

export async function updateCar(carId: number, payload: CarRequest): Promise<Car> {
  const { data } = await http.put<CarDto>(`/api/admin/cars/${carId}`, payload)
  return toCar(data)
}

export async function deleteCar(carId: number): Promise<void> {
  await http.delete(`/api/admin/cars/${carId}`)
}

export async function uploadCarImages(
  carId: number,
  files: File[],
): Promise<CarImage[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  const { data } = await http.post<CarImage[]>(`/api/admin/cars/${carId}/images`, formData)
  return data
}

export async function deleteCarImage(carId: number, imageId: number): Promise<void> {
  await http.delete(`/api/admin/cars/${carId}/images/${imageId}`)
}

export async function setPrimaryCarImage(carId: number, imageId: number): Promise<CarImage> {
  const { data } = await http.patch<CarImage>(`/api/admin/cars/${carId}/images/${imageId}/primary`)
  return data
}
