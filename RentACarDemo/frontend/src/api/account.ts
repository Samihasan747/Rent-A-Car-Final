import { http } from '@/lib/http'
import { toUser } from '@/lib/adapters'
import type { UpdateProfileRequest, User, UserDto } from '@/types/api'

export async function getMe(): Promise<User> {
  const { data } = await http.get<UserDto>('/api/user/me')
  return toUser(data)
}

/** Phase A profile DTO: name and email only, never a password. */
export async function updateProfile(payload: UpdateProfileRequest): Promise<User> {
  const { data } = await http.put<UserDto>('/api/user/me', payload)
  return toUser(data)
}

/** Soft-deletes the current account and cancels its active bookings. */
export async function deleteAccount(): Promise<void> {
  await http.patch('/api/user/me')
}
