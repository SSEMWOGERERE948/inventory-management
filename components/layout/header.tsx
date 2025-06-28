"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Bell, LogOut, Settings, User, Menu, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface HeaderProps {
  user: {
    name: string
    email: string
    role: string
    companyName?: string
  }
  onMobileMenuToggle?: () => void
}

export function Header({ user, onMobileMenuToggle }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "COMPANY_DIRECTOR":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrator"
      case "COMPANY_DIRECTOR":
        return "Director"
      default:
        return "User"
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      toast.success("Logging out...")
      await signOut({
        callbackUrl: "/auth/signin",
        redirect: true,
      })
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout")
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center space-x-4">
        {onMobileMenuToggle && (
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMobileMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">
            {user.role === "ADMIN"
              ? "Admin Dashboard"
              : user.role === "COMPANY_DIRECTOR"
                ? "Director Dashboard"
                : "My Dashboard"}
          </h1>
          <Badge className={getRoleBadgeColor(user.role)}>{getRoleDisplay(user.role)}</Badge>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <ThemeToggle />

        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                {user.companyName && <p className="text-xs leading-none text-muted-foreground">{user.companyName}</p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
            >
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
