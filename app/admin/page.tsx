'use client'

import { useEffect, useState } from 'react'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function AdminDashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    activeOrders: 0
  })
  const [loading, setLoading] = useState(true)

  const mockUser = {
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'ADMIN'
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sample chart data - in real app, this would come from API
  const chartData = [
    { name: 'Jan', companies: 12, users: 45, revenue: 15000 },
    { name: 'Feb', companies: 15, users: 58, revenue: 18500 },
    { name: 'Mar', companies: 18, users: 72, revenue: 22000 },
    { name: 'Apr', companies: 22, users: 89, revenue: 28500 },
    { name: 'May', companies: 25, users: 103, revenue: 32000 },
    { name: 'Jun', companies: 28, users: 121, revenue: 37500 },
  ]

  const pieData = [
    { name: 'Active Companies', value: 85, color: '#3B82F6' },
    { name: 'Pending Setup', value: 15, color: '#F59E0B' },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="ADMIN" />
      <MobileSidebar 
        userRole="ADMIN" 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={mockUser} 
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <StatsCard
                title="Total Companies"
                value={loading ? '...' : stats.totalCompanies}
                change={{ value: 12, type: 'increase' }}
                icon={Building2}
                description="Active companies"
              />
              <StatsCard
                title="Total Users"
                value={loading ? '...' : stats.totalUsers}
                change={{ value: 8, type: 'increase' }}
                icon={Users}
                description="Across all companies"
              />
              <StatsCard
                title="Monthly Revenue"
                value={loading ? '...' : `$${stats.monthlyRevenue.toLocaleString()}`}
                change={{ value: 15, type: 'increase' }}
                icon={DollarSign}
                description="This month"
              />
              <StatsCard
                title="Active Orders"
                value={loading ? '...' : stats.activeOrders}
                change={{ value: 5, type: 'increase' }}
                icon={TrendingUp}
                description="Being processed"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Growth Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="companies" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Companies"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}: {entry.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <div className="font-medium text-sm">Create New Company</div>
                  <div className="text-xs text-muted-foreground">Add a new company to the platform</div>
                </button>
                <button className="p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <div className="font-medium text-sm">View All Users</div>
                  <div className="text-xs text-muted-foreground">Manage user accounts and permissions</div>
                </button>
                <button className="p-4 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                  <div className="font-medium text-sm">System Analytics</div>
                  <div className="text-xs text-muted-foreground">View detailed platform analytics</div>
                </button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}