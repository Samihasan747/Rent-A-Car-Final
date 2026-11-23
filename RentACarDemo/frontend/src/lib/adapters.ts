import type { BookedCarDto, Car, CarDto, CarImageDto, User, UserDto } from '@/types/api'

export function toCar(dto: CarDto): Car {
  const images: CarImageDto[] = (dto.images ?? []).map((img) => ({ ...img }))

  let primaryImageUrl: string | null = dto.primaryImageUrl ?? null
  if (images.length > 0) {
    const primary = images.find((img) => img.primary) ?? images[0]
    primaryImageUrl = primary.url
  }

  const car: Car = {
    id: dto.Id,
    name: dto.name,
    model: dto.model,
    booked: dto.booked ?? false,
    price: dto.price,
  }

  car.primaryImageUrl = primaryImageUrl
  car.images = images

  return car
}

export function toBookedCar(dto: BookedCarDto): Car {
  return {
    id: dto.id,
    name: dto.name,
    model: dto.model,
    booked: dto.booked ?? false,
    price: dto.price,
  }
}

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    bookedCar: dto.bookedCar ? toBookedCar(dto.bookedCar) : null,
  }
}
