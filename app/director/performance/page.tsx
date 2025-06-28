"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, Users, Package, DollarSign, Award, Target, Download } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface PerformanceData {
  userPerformance: Array<{
    userId: string
    userName: string
    userEmail: string
    totalOrders: number
    totalPayments: number
    totalExpenses: number
    avgOrderValue: number
    lastActivity: string
  }>
  monthlyTrends: Array<{
    month: string
    orders: number
    payments: number
    expenses: number
    users: number
  }>
  categoryBreakdown: Array<{
    category: string
    amount: number
    count: number
  }>
  kpis: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    activeUsers: number
    avgOrderValue: number
    orderFulfillmentRate: number
  }
}

export default function PerformancePage() {
  const { data: session } = useSession()
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("6months")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const mockUser = {
    name: "Director Smith",
    email: "director@demo.com",
    role: "COMPANY_DIRECTOR",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    if (session?.user?.role === "COMPANY_DIRECTOR") {
      fetchPerformanceData()
    }
  }, [session, selectedPeriod])

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch(`/api/director/performance?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setPerformanceData(data)
      }
    } catch (error) {
      console.error("Error fetching performance data:", error)
      toast.error("Failed to fetch performance data")
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!performanceData) return

    const csvContent = [
      ["User Performance Report"],
      [""],
      ["User", "Total Orders", "Total Payments", "Total Expenses", "Avg Order Value", "Last Activity"],
      ...performanceData.userPerformance.map((user) => [
        user.userName,
        user.totalOrders.toString(),
        user.totalPayments.toFixed(2),
        user.totalExpenses.toFixed(2),
        user.avgOrderValue.toFixed(2),
        format(new Date(user.lastActivity), "yyyy-MM-dd"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `performance-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Safe string conversion for user name
  const getUserInitial = (name: string | number | null | undefined): string => {
    if (typeof name === "string" && name.length > 0) {
      return name.charAt(0).toUpperCase()
    }
    return "U" // Default fallback
  }

  if (session?.user?.role !== "COMPANY_DIRECTOR") {
    return <div className="text-center py-8">Access denied. Director role required.</div>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading performance data...</div>
  }

  if (!performanceData) {
    return <div className="text-center py-8">No performance data available.</div>
  }

  const { userPerformance, monthlyTrends, categoryBreakdown, kpis } = performanceData

  const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="COMPANY_DIRECTOR" companyName="TechCorp Solutions" />
      <MobileSidebar
        userRole="COMPANY_DIRECTOR"
        companyName="TechCorp Solutions"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={mockUser} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Performance Analytics</h1>
                <p className="text-muted-foreground">Comprehensive performance insights and analytics</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportReport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">${kpis.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className={`text-2xl font-bold ${kpis.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${kpis.netProfit.toLocaleString()}
                      </p>
                    </div>
                    {kpis.netProfit >= 0 ? (
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{kpis.activeUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">${kpis.avgOrderValue.toFixed(2)}</p>
                    </div>
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Fulfillment</p>
                      <p className="text-2xl font-bold">{(kpis.orderFulfillmentRate * 100).toFixed(1)}%</p>
                    </div>
                    <Award className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">${kpis.totalExpenses.toLocaleString()}</p>
                    </div>
                    <Package className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "payments" || name === "expenses"
                            ? `$${Number(value).toLocaleString()}`
                            : Number(value).toLocaleString(),
                          typeof name === "string" ? name.charAt(0).toUpperCase() + name.slice(1) : String(name),
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="payments"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Payments"
                        dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Expenses"
                        dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Orders"
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Amount"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No expense data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>User Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {userPerformance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>Expenses</TableHead>
                          <TableHead>Avg Order Value</TableHead>
                          <TableHead>Performance</TableHead>
                          <TableHead>Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPerformance.map((user) => {
                          const efficiency = user.totalPayments > 0 ? user.totalPayments / (user.totalExpenses || 1) : 0
                          const performanceLevel = efficiency > 2 ? "high" : efficiency > 1 ? "medium" : "low"

                          return (
                            <TableRow key={user.userId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.userName}</p>
                                  <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell>{user.totalOrders}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ${user.totalPayments.toFixed(2)}
                              </TableCell>
                              <TableCell className="font-semibold text-red-600">
                                ${user.totalExpenses.toFixed(2)}
                              </TableCell>
                              <TableCell>${user.avgOrderValue.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={performanceLevel === "high" ? "default" : "secondary"}
                                  className={
                                    performanceLevel === "high"
                                      ? "bg-green-100 text-green-800"
                                      : performanceLevel === "medium"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }
                                >
                                  {performanceLevel.charAt(0).toUpperCase() + performanceLevel.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(user.lastActivity), "MMM dd, yyyy")}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No user performance data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
