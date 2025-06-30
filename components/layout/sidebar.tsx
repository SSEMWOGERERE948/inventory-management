'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  BarChart3,
  Building2,
  ChevronLeft,
  DollarSign,
  Home,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Bell,
  Settings,
  TrendingUp,
  AlertTriangle,
  LucideIcon
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  badge?: string
}

interface SidebarProps {
  userRole: string
  companyName?: string
  className?: string
  isMobile?: boolean
  onClose?: () => void
}

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Companies', href: '/admin/companies', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

const directorNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/director', icon: Home },
  { name: 'Products', href: '/director/products', icon: Package },
  { name: 'Users', href: '/director/users', icon: Users },
  { name: 'Orders', href: '/director/orders', icon: ShoppingCart },
  { name: 'Payments', href: '/director/payments', icon: DollarSign },
  { name: 'Expenses', href: '/director/expenses', icon: FileText },
  { name: 'Performance', href: '/director/performance', icon: TrendingUp },
  { name: 'Stock Alerts', href: '/director/stock-alerts', icon: AlertTriangle, badge: '3' },
]

const userNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'My Payments', href: '/dashboard/payments', icon: DollarSign },
  { name: 'My Expenses', href: '/dashboard/expenses', icon: FileText },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: '2' },
]

function SidebarContent({ userRole, companyName, collapsed, setCollapsed, onClose }: SidebarProps & { collapsed?: boolean, setCollapsed?: (collapsed: boolean) => void }) {
  const pathname = usePathname()

  const navItems: NavItem[] = userRole === 'ADMIN' ? adminNavItems : 
                              userRole === 'COMPANY_DIRECTOR' ? directorNavItems : 
                              userNavItems

  return (
    <div className={cn(
      'flex flex-col h-full bg-background border-r border-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-foreground">Inventory Pro</h2>
            {companyName && (
              <p className="text-sm text-muted-foreground truncate">{companyName}</p>
            )}
          </div>
        )}
        {setCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'transform rotate-180'
            )} />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href} onClick={onClose}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className={cn(
          'flex items-center gap-3 text-sm text-muted-foreground',
          collapsed && 'justify-center'
        )}>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {userRole === 'ADMIN' ? 'A' : userRole === 'COMPANY_DIRECTOR' ? 'D' : 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-medium">
                {userRole === 'ADMIN' ? 'Admin' : 
                 userRole === 'COMPANY_DIRECTOR' ? 'Director' : 
                 'User'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ userRole, companyName, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent 
          userRole={userRole} 
          companyName={companyName}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </div>
    </>
  )
}

export function MobileSidebar({ userRole, companyName, isOpen, onClose }: SidebarProps & { isOpen: boolean, onClose: () => void }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="p-0 w-64">
        <SidebarContent 
          userRole={userRole} 
          companyName={companyName}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}