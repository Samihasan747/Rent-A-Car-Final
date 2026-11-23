import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { defaultRouteFor, safeRedirect } from '@/auth/redirect'
import { loginSchema, type LoginValues } from '@/auth/schemas'
import { useAuth } from '@/auth/use-auth'
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

interface LoginLocationState {
  registered?: boolean
  registeredEmail?: string
}

export function LoginPage() {
  const { login, sessionMessage, clearSessionMessage } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirect = safeRedirect(
    new URLSearchParams(location.search).get('redirect'),
  )
  const locationState = location.state as LoginLocationState | null
  const justRegistered = locationState?.registered === true
  const registeredEmail = justRegistered
    ? (locationState?.registeredEmail ?? '')
    : ''

  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: registeredEmail,
      password: '',
    },
  })

  const isSubmitting = form.formState.isSubmitting

  function applyServerFieldErrors(fieldErrors?: Record<string, string>) {
    if (!fieldErrors) {
      return false
    }

    let applied = false
    for (const key of ['email', 'password'] as const) {
      const message = fieldErrors[key]
      if (message) {
        form.setError(key, { type: 'server', message })
        applied = true
      }
    }
    return applied
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null)

    try {
      const user = await login(values.email, values.password)
      const target = redirect ?? defaultRouteFor(user.role)
      navigate(target, { replace: true })
    } catch (error) {
      if (!isApiError(error)) {
        setFormError('Something went wrong. Please try again.')
        return
      }

      applyServerFieldErrors(error.fieldErrors)

      if (error.status === 401) {
        setFormError('Invalid email or password. Please try again.')
      } else if (error.status === 400 && error.fieldErrors) {
        setFormError('Please check the highlighted fields and try again.')
      } else if (error.status === 0) {
        setFormError(error.message)
      } else if (error.status >= 500) {
        setFormError(
          'The server could not complete your request. Please try again shortly.',
        )
      } else {
        setFormError(error.message || 'Sign-in failed. Please try again.')
      }
    }
  }

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register'

  return (
    <AuthShell mode="login">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Welcome back
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Sign in to VELOCITY
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use your account email and password to continue.
          </p>
        </div>

        <div className="surface-panel p-6 sm:p-8">
          <div className="mb-5 space-y-3 empty:mb-0">
            {justRegistered ? (
              <FormAlert variant="success">
                Your account was created
                {registeredEmail ? (
                  <>
                    {' '}
                    for <span className="font-medium">{registeredEmail}</span>
                  </>
                ) : null}
                . Sign in to continue.
              </FormAlert>
            ) : null}

            {sessionMessage ? (
              <FormAlert variant="warning" onDismiss={clearSessionMessage}>
                {sessionMessage}
              </FormAlert>
            ) : null}

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
                          Minimum 8 characters
                        </span>
                      </div>
                      <FormControl>
                        <PasswordInput
                          autoComplete="current-password"
                          placeholder="Enter your password"
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
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">
              New to VELOCITY?{' '}
              <Link
                to={registerHref}
                className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-ring"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          Sessions expire after 15 minutes for your security.
        </p>
      </div>
    </AuthShell>
  )
}
