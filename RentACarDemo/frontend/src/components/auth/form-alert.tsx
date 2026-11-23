import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, ShieldAlert, X } from 'lucide-react'

import { cn } from '@/lib/utils'

type AlertVariant = 'error' | 'success' | 'warning'

const styles: Record<AlertVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

const icons = {
  error: CircleAlert,
  success: CircleCheck,
  warning: ShieldAlert,
}

interface FormAlertProps {
  variant?: AlertVariant
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

export function FormAlert({
  variant = 'error',
  children,
  onDismiss,
  className,
}: FormAlertProps) {
  const Icon = icons[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
        styles[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 rounded-md p-0.5 opacity-80 transition-opacity hover:opacity-100 focus-ring"
          aria-label="Dismiss message"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
