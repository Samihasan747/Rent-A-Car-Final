import { Moon, Sun } from 'lucide-react'

import { useTheme } from './use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-all duration-200 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-all duration-200 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
