import { http } from '@/lib/http'
import type { LoginRequest, LoginResponse, RegisterRequest, UserDto } from '@/types/api'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterRequest): Promise<UserDto> {
  const { data } = await http.post<UserDto>('/api/user/register', payload)
  return data
}
