import { z } from 'zod'

const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

const passwordField = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
})

export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name is too long'),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type RegisterValues = z.infer<typeof registerSchema>
