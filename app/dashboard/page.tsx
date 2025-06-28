"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Plus } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Order {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    product: {
      name: string
    }
  }>
}

interface Payment {
  id: string
  amount: number
  description: string
  paymentDate: string
  createdAt: string
}

interface Expense {
  id: string
  amount: number
  description: string
  category?: string
  expenseDate: string
  createdAt: string
}

interface Activity {
  id: string
  type: "order" | "payment" | "user" | "stock"
  title: string
  description: string
  timestamp: Date
  status: "pending" | "approved" | "completed" | "rejected"
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [stats, setStats] = useState({
    activeOrders: 0,
    monthlyExpenses: 0,
    totalPayments: 0,
    pendingApprovals: 0,
  })

  useEffect(() => {
    if (!session) return
    fetchDashboardData()
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, paymentsRes, expensesRes, statsRes] = await Promise.all([
        fetch("/api/user/orders"),
        fetch("/api/user/payments"),
        fetch("/api/user/expenses"),
        fetch("/api/dashboard/stats"),
      ])

      const [ordersData, paymentsData, expensesData, statsData] = await Promise.all([
        ordersRes.ok ? ordersRes.json() : [],
        paymentsRes.ok ? paymentsRes.json() : [],
        expensesRes.ok ? expensesRes.json() : [],
        statsRes.ok ? statsRes.json() : null,
      ])

      setOrders(ordersData)
      setPayments(paymentsData)
      setExpenses(expensesData)
      setDashboardStats(statsData)

      // Calculate user stats
      const activeOrders = ordersData.filter((order: Order) =>
        ["PENDING", "APPROVED", "SHIPPED"].includes(order.status),
      ).length

      const pendingApprovals = ordersData.filter((order: Order) => order.status === "PENDING").length

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      const monthlyExpenses = expensesData
        .filter((expense: Expense) => {
          const expenseDate = new Date(expense.expenseDate)
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
        })
        .reduce((total: number, expense: Expense) => total + Number(expense.amount), 0)

      const totalPayments = paymentsData.reduce((total: number, payment: Payment) => total + Number(payment.amount), 0)

      setStats({
        activeOrders,
        monthlyExpenses,
        totalPayments,
        pendingApprovals,
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Generate chart data from real payments and expenses
  const generateChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentYear = new Date().getFullYear()

    return months.map((month, index) => {
      const monthPayments = payments
        .filter((payment) => {
          const paymentDate = new Date(payment.paymentDate)
          return paymentDate.getMonth() === index && paymentDate.getFullYear() === currentYear
        })
        .reduce((total, payment) => total + Number(payment.amount), 0)

      const monthExpenses = expenses
        .filter((expense) => {
          const expenseDate = new Date(expense.expenseDate)
          return expenseDate.getMonth() === index && expenseDate.getFullYear() === currentYear
        })
        .reduce((total, expense) => total + Number(expense.amount), 0)

      return {
        name: month,
        expenses: Math.round(monthExpenses),
        payments: Math.round(monthPayments),
      }
    })
  }

  // Generate recent activities from real data
  const generateRecentActivities = (): Activity[] => {
    const activities: Activity[] = []

    // Add recent orders
    orders.slice(0, 3).forEach((order) => {
      const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)
      activities.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Order ${order.status.toLowerCase()}`,
        description: `Order ${order.id.slice(-8)} with ${itemCount} items - $${Number(order.totalAmount).toFixed(2)}`,
        timestamp: new Date(order.createdAt),
        status: order.status.toLowerCase() as Activity["status"],
      })
    })

    // Add recent payments
    payments.slice(0, 2).forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: "payment",
        title: "Payment Recorded",
        description: `${payment.description} - ugx${Number(payment.amount).toFixed(2)}`,
        timestamp: new Date(payment.createdAt),
        status: "completed",
      })
    })

    // Add recent expenses (using "stock" type to match the expected interface)
    expenses.slice(0, 2).forEach((expense) => {
      activities.push({
        id: `expense-${expense.id}`,
        type: "stock",
        title: "Expense Added",
        description: `${expense.description} - ugx${Number(expense.amount).toFixed(2)}`,
        timestamp: new Date(expense.createdAt),
        status: "completed",
      })
    })

    // Sort by timestamp and return top 5
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "SHIPPED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const user = {
    name: session?.user.name || "User",
    email: session?.user.email || "",
    role: session?.user.role || "USER",
    companyName: session?.user.companyName || "Company",
  }

  const expenseData = generateChartData()
  const recentActivities = generateRecentActivities()
  const myOrders = orders.slice(0, 3).map((order) => ({
    id: order.id,
    items: order.items.reduce((total, item) => total + item.quantity, 0),
    total: Number(order.totalAmount),
    status: order.status,
    date: new Date(order.createdAt),
  }))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user.role as any} companyName={user.companyName} />
      <MobileSidebar
        userRole={user.role as any}
        companyName={user.companyName}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-6 text-white">
              <h1 className="text-xl sm:text-2xl font-bold mb-2">Welcome back, {user.name.split(" ")[0]}!</h1>
              <p className="text-blue-100 dark:text-blue-200">Here's what's happening with your account today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {session?.user.role === "ADMIN" && dashboardStats && (
                <>
                  <StatsCard
                    title="Total Products"
                    value={loading ? "..." : dashboardStats.totalProducts}
                    description="Total products in inventory"
                    className="border-l-4 border-l-blue-400"
                  />
                  <StatsCard
                    title="Total Orders"
                    value={loading ? "..." : dashboardStats.totalOrders}
                    description="Total orders placed"
                    className="border-l-4 border-l-green-400"
                  />
                  <StatsCard
                    title="Total Companies"
                    value={loading ? "..." : dashboardStats.totalCompanies}
                    description="Total companies registered"
                    className="border-l-4 border-l-purple-400"
                  />
                  <StatsCard
                    title="Total Users"
                    value={loading ? "..." : dashboardStats.totalUsers}
                    description="Total users registered"
                    className="border-l-4 border-l-orange-400"
                  />
                  <StatsCard
                    title="Low Stock Items"
                    value={loading ? "..." : dashboardStats.lowStockProducts}
                    description="Items with low stock"
                    className="border-l-4 border-l-red-400"
                  />
                  <StatsCard
                    title="Pending Orders"
                    value={loading ? "..." : dashboardStats.pendingOrders}
                    description="Orders awaiting approval"
                    className="border-l-4 border-l-yellow-400"
                  />
                  <StatsCard
                    title="Total Payments"
                    value={loading ? "..." : `ugx${dashboardStats.totalPayments.toLocaleString()}`}
                    description="Total payments received"
                    className="border-l-4 border-l-emerald-400"
                  />
                  <StatsCard
                    title="Total Expenses"
                    value={loading ? "..." : `ugx${dashboardStats.totalExpenses.toLocaleString()}`}
                    description="Total expenses recorded"
                    className="border-l-4 border-l-rose-400"
                  />
                </>
              )}
              {session?.user.role !== "ADMIN" && (
                <>
                  <StatsCard
                    title="Active Orders"
                    value={loading ? "..." : stats.activeOrders}
                    description="Currently processing"
                    className="border-l-4 border-l-blue-400"
                  />
                  <StatsCard
                    title="Monthly Expenses"
                    value={loading ? "..." : `ugx${stats.monthlyExpenses.toLocaleString()}`}
                    change={{ value: 8, type: "increase" }}
                    description="This month"
                  />
                  <StatsCard
                    title="Total Payments"
                    value={loading ? "..." : `ugx${stats.totalPayments.toLocaleString()}`}
                    change={{ value: 12, type: "increase" }}
                    description="Recorded payments"
                  />
                  <StatsCard
                    title="Pending Approval"
                    value={loading ? "..." : stats.pendingApprovals}
                    description="Awaiting director review"
                    className="border-l-4 border-l-yellow-400"
                  />
                </>
              )}
            </div>

            {/* Orders and Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>My Recent Orders</CardTitle>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Order</span>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
                      ) : myOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No orders found</div>
                      ) : (
                        myOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{order.id.slice(-8)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {order.items} items • ugx{order.total.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                              <p className="text-xs text-muted-foreground">{order.date.toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="font-medium text-sm">Order Missing Stock</div>
                    <div className="text-xs text-muted-foreground">Request out-of-stock items</div>
                  </button>
                  <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="font-medium text-sm">Upload Receipt</div>
                    <div className="text-xs text-muted-foreground">Record a new payment</div>
                  </button>
                  <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="font-medium text-sm">Add Expense</div>
                    <div className="text-xs text-muted-foreground">Log business expense</div>
                  </button>
                  <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="font-medium text-sm">View My Performance</div>
                    <div className="text-xs text-muted-foreground">See sales metrics</div>
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Chart and Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={expenseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="payments"
                          stackId="1"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.6}
                          name="Payments"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stackId="2"
                          stroke="#EF4444"
                          fill="#EF4444"
                          fillOpacity={0.6}
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <RecentActivity activities={loading ? [] : recentActivities} title="My Activity" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
