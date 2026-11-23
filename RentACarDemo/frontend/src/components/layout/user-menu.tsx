import { CalendarRange, ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/auth/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/format'

export function UserMenu() {
  const { user, isAdmin, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full pr-2 pl-1.5"
          aria-label="Account menu"
        >
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="bg-primary/10 text-[0.7rem] font-semibold text-primary">
              {initials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
            {user.name}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="text-sm font-semibold text-foreground">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
          {isAdmin ? (
            <span className="mt-1 text-[0.65rem] font-medium tracking-wide text-primary uppercase">
              Administrator
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/account" className="cursor-pointer">
              <UserRound aria-hidden="true" />
              My account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/bookings" className="cursor-pointer">
              <CalendarRange aria-hidden="true" />
              My bookings
            </Link>
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <ShieldCheck aria-hidden="true" />
                Admin console
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
