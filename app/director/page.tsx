"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, DollarSign, Package, AlertTriangle, CheckCircle, XCircle, Boxes } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface UserInventorySummary {
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    creditLimit: number
    creditUsed: number
    creditAvailable: number
  }
  inventory: {
    totalProducts: number
    productsInStock: number
    outOfStockProducts: number
    lowStockProducts: number
    totalQuantity: number
    inventoryValue: number
  }
  performance: {
    recentOrders: number
    monthlyPayments: number
  }
}

interface CompanyStats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  approvedOrders: number
  shippedOrders: number
  totalPayments: number
  totalExpenses: number
  lowStockAlerts: number
}

interface CompanyInventory {
  totalProducts: number
  productsInStock: number
  outOfStockProducts: number
  lowStockProducts: number
  totalQuantity: number
  inventoryValue: number
}

interface DashboardData {
  companyStats: CompanyStats
  companyInventory: CompanyInventory
  userInventorySummary: UserInventorySummary[]
}

export default function DirectorDashboard() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.role === "COMPANY_DIRECTOR") {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/director/dashboard")
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const getInventoryStatusColor = (inventory: UserInventorySummary["inventory"]) => {
    if (inventory.outOfStockProducts > 0) return "text-red-600"
    if (inventory.lowStockProducts > 0) return "text-yellow-600"
    return "text-green-600"
  }

  const getInventoryStatusBadge = (inventory: UserInventorySummary["inventory"]) => {
    if (inventory.outOfStockProducts > 0) {
      return <Badge variant="destructive">Critical</Badge>
    }
    if (inventory.lowStockProducts > 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Low Stock
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Good
      </Badge>
    )
  }

  const user = {
    name: session?.user.name || "Director",
    email: session?.user.email || "",
    role: session?.user.role || "COMPANY_DIRECTOR",
    companyName: session?.user.companyName || "Company",
  }

  // Generate chart data for inventory overview
  const inventoryChartData =
    dashboardData?.userInventorySummary.map((userSummary) => ({
      name: userSummary.user.name?.split(" ")[0] || "User",
      inStock: userSummary.inventory.productsInStock,
      lowStock: userSummary.inventory.lowStockProducts,
      outOfStock: userSummary.inventory.outOfStockProducts,
      value: userSummary.inventory.inventoryValue,
    })) || []

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole={user.role as any} companyName={user.companyName} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Alert className="max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error || "Failed to load dashboard data"}</AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    )
  }

  const { companyStats, companyInventory, userInventorySummary } = dashboardData

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
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-lg p-6 text-white">
              <h1 className="text-xl sm:text-2xl font-bold mb-2">Director Dashboard</h1>
              <p className="text-purple-100 dark:text-purple-200">
                Welcome back, {user.name.split(" ")[0]}! Here's your company overview.
              </p>
            </div>

            {/* Company-wide Alerts */}
            {(companyInventory.lowStockProducts > 0 || companyInventory.outOfStockProducts > 0) && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Company-wide inventory alert:{" "}
                  {companyInventory.outOfStockProducts > 0 && (
                    <span className="font-medium">{companyInventory.outOfStockProducts} products out of stock, </span>
                  )}
                  {companyInventory.lowStockProducts > 0 && (
                    <span>{companyInventory.lowStockProducts} products low on stock.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Company Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <StatsCard
                title="Total Users"
                value={companyStats.totalUsers}
                description="Active company users"
                className="border-l-4 border-l-blue-400"
              />
              <StatsCard
                title="Total Orders"
                value={companyStats.totalOrders}
                description={`${companyStats.pendingOrders} pending`}
                className="border-l-4 border-l-green-400"
              />
              <StatsCard
                title="Total Payments"
                value={`UGX${companyStats.totalPayments.toLocaleString()}`}
                description="Company revenue"
                className="border-l-4 border-l-emerald-400"
              />
              <StatsCard
                title="Stock Alerts"
                value={companyStats.lowStockAlerts}
                description="Require attention"
                className="border-l-4 border-l-red-400"
              />
            </div>

            {/* Company Inventory Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Company Inventory Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{companyInventory.totalProducts}</p>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                  </div>

                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{companyInventory.totalQuantity}</p>
                    <p className="text-sm text-muted-foreground">Items Available</p>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{companyInventory.lowStockProducts}</p>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                  </div>

                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-600">
                      UGX{companyInventory.inventoryValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Inventory Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Inventory Summary
                </CardTitle>
                <Button onClick={fetchDashboardData} variant="outline" size="sm">
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading user inventories...</div>
                ) : userInventorySummary && userInventorySummary.length > 0 ? (
                  <div className="space-y-4">
                    {userInventorySummary.map((userSummary) => (
                      <div
                        key={userSummary.user.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{userSummary.user.name}</p>
                            <p className="text-sm text-muted-foreground">{userSummary.user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {userSummary.inventory.totalProducts} products
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {userSummary.inventory.totalQuantity} items
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2">
                            {getInventoryStatusBadge(userSummary.inventory)}
                            <span className="text-sm font-medium">
                              UGX{userSummary.inventory.inventoryValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              {userSummary.inventory.productsInStock}
                            </span>
                            {userSummary.inventory.lowStockProducts > 0 && (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                {userSummary.inventory.lowStockProducts}
                              </span>
                            )}
                            {userSummary.inventory.outOfStockProducts > 0 && (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-600" />
                                {userSummary.inventory.outOfStockProducts}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No user inventories found</p>
                    <p className="text-sm">Users will appear here once they receive shipped orders</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Inventory Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={inventoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="inStock"
                          stackId="1"
                          stroke="#10B981"
                          fill="#10B981"
                          fillOpacity={0.6}
                          name="In Stock"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowStock"
                          stackId="1"
                          stroke="#F59E0B"
                          fill="#F59E0B"
                          fillOpacity={0.6}
                          name="Low Stock"
                        />
                        <Area
                          type="monotone"
                          dataKey="outOfStock"
                          stackId="1"
                          stroke="#EF4444"
                          fill="#EF4444"
                          fillOpacity={0.6}
                          name="Out of Stock"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No inventory data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {companyInventory.totalProducts > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "In Stock", value: companyInventory.productsInStock, color: "#10B981" },
                            { name: "Low Stock", value: companyInventory.lowStockProducts, color: "#F59E0B" },
                            { name: "Out of Stock", value: companyInventory.outOfStockProducts, color: "#EF4444" },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: "In Stock", value: companyInventory.productsInStock, color: "#10B981" },
                            { name: "Low Stock", value: companyInventory.lowStockProducts, color: "#F59E0B" },
                            { name: "Out of Stock", value: companyInventory.outOfStockProducts, color: "#EF4444" },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No inventory data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
