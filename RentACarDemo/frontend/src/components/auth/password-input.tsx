import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Password field with an in-place visibility toggle. It forwards the ref and
 * all form props from React Hook Form, so it works inside <FormControl>.
 */
export function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <LockKeyhole
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('h-10 pr-10 pl-9', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
