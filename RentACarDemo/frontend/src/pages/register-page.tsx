import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { register as registerUser } from '@/api/auth'
import { safeRedirect } from '@/auth/redirect'
import { registerSchema, type RegisterValues } from '@/auth/schemas'
import { AuthShell } from '@/components/auth/auth-shell'
import { FormAlert } from '@/components/auth/form-alert'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/lib/http'

interface RegisterLocationState {
  registered?: boolean
  registeredEmail?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirect = safeRedirect(
    new URLSearchParams(location.search).get('redirect'),
  )

  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const isSubmitting = form.formState.isSubmitting

  function applyServerFieldErrors(fieldErrors?: Record<string, string>) {
    if (!fieldErrors) {
      return false
    }

    let applied = false
    for (const key of ['name', 'email', 'password'] as const) {
      const message = fieldErrors[key]
      if (message) {
        form.setError(key, { type: 'server', message })
        applied = true
      }
    }
    return applied
  }

  async function onSubmit(values: RegisterValues) {
    setFormError(null)

    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      })

      const loginPath = redirect
        ? `/login?redirect=${encodeURIComponent(redirect)}`
        : '/login'

      const state: RegisterLocationState = {
        registered: true,
        registeredEmail: values.email,
      }

      // Registration never returns a token, so the user signs in explicitly.
      navigate(loginPath, { replace: true, state })
    } catch (error) {
      if (!isApiError(error)) {
        setFormError('Something went wrong. Please try again.')
        return
      }

      const hasFieldErrors = applyServerFieldErrors(error.fieldErrors)

      if (error.status === 409) {
        const message = error.message || 'An account with this email already exists.'
        form.setError('email', { type: 'server', message })
        setFormError(
          'An account with this email already exists. Sign in instead.',
        )
      } else if (error.status === 400) {
        setFormError(
          hasFieldErrors
            ? 'Please check the highlighted fields and try again.'
            : error.message,
        )
      } else if (error.status === 0) {
        setFormError(error.message)
      } else if (error.status >= 500) {
        setFormError(
          'The server could not create your account. Please try again shortly.',
        )
      } else {
        setFormError(error.message || 'Registration failed. Please try again.')
      }
    }
  }

  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login'

  return (
    <AuthShell mode="register">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Create your account
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Join VELOCITY
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A few details and you can start booking by date.
          </p>
        </div>

        <div className="surface-panel p-6 sm:p-8">
          <div className="mb-5 space-y-3 empty:mb-0">
            {formError ? (
              <FormAlert variant="error" onDismiss={() => setFormError(null)}>
                {formError}
              </FormAlert>
            ) : null}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <div className="relative">
                        <UserRound
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <FormControl>
                          <Input
                            type="text"
                            autoComplete="name"
                            placeholder="Your full name"
                            className="h-10 pl-9"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className="h-10 pl-9"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-3">
                        <FormLabel>Password</FormLabel>
                        <span className="text-xs text-muted-foreground">
                          At least 8 characters
                        </span>
                      </div>
                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder="Create a password"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-6 h-10 w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to={loginHref}
                className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-ring"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Your password is hashed by the server and is never stored in the
          browser.
        </p>
      </div>
    </AuthShell>
  )
}
