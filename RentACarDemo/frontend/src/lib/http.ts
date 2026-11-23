import axios, { type AxiosError } from 'axios'

import { isTokenExpired } from './jwt'
import { clearToken, getToken, UNAUTHORIZED_EVENT } from './token-store'
import type { ApiErrorBody, ValidationErrorBody } from '@/types/api'

/**
 * Empty by default so the browser calls the Vite dev proxy in development.
 * Set VITE_API_BASE_URL when the API lives on another origin.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors?: Record<string, string>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (!token) {
    return config
  }

  if (isTokenExpired(token)) {
    clearToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }

  config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody & Partial<ValidationErrorBody>>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    const fieldErrors =
      body && 'fieldErrors' in body && body.fieldErrors ? body.fieldErrors : undefined

    const message =
      body?.message ||
      (status === 0
        ? 'Unable to reach the server. Check that the backend is running.'
        : error.message) ||
      'The request could not be completed.'

    const isLoginRequest = error.config?.url?.startsWith('/auth/') ?? false
    if (status === 401 && !isLoginRequest) {
      clearToken()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }

    return Promise.reject(new ApiError(message, status, fieldErrors))
  },
)
