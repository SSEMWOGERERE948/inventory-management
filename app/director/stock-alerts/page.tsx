"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AlertTriangle, Package, RefreshCw, Bell, TrendingDown, Plus, Settings, CheckCircle, Eye } from "lucide-react"

interface StockAlert {
  id: string
  productId: string
  productName: string
  productSku: string
  currentStock: number
  minThreshold: number
  maxThreshold: number
  alertType: "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCK"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  message: string
  createdAt: string
  isResolved: boolean
}

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
  minStock: number | null
  maxStock: number | null
  price: number
  category?: {
    name: string
  }
}

export default function StockAlertsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null)
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [restockQuantity, setRestockQuantity] = useState("")
  const [minThreshold, setMinThreshold] = useState("")
  const [maxThreshold, setMaxThreshold] = useState("")
  const [filterSeverity, setFilterSeverity] = useState("ALL")
  const [filterType, setFilterType] = useState("ALL")

  const mockUser = {
    name: "Director Smith",
    email: "director@demo.com",
    role: "COMPANY_DIRECTOR",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchStockAlerts()
    fetchProducts()
  }, [])

  const fetchStockAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/director/stock-alerts")
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
      } else {
        console.error("Failed to fetch stock alerts")
        toast.error("Failed to fetch stock alerts")
        setAlerts([])
      }
    } catch (error) {
      console.error("Error fetching stock alerts:", error)
      toast.error("Error fetching stock alerts")
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        console.error("Failed to fetch products")
        setProducts([])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    }
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !restockQuantity) {
      toast.error("Please select a product and enter quantity")
      return
    }

    try {
      const response = await fetch("/api/products/restock", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: Number.parseInt(restockQuantity),
        }),
      })

      if (response.ok) {
        toast.success("Product restocked successfully")
        setIsRestockDialogOpen(false)
        setSelectedProduct(null)
        setRestockQuantity("")
        // Refresh both alerts and products to reflect changes
        fetchStockAlerts()
        fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to restock product")
      }
    } catch (error) {
      toast.error("Error restocking product")
    }
  }

  const updateThresholds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !minThreshold || !maxThreshold) {
      toast.error("Please fill in all threshold values")
      return
    }

    try {
      const response = await fetch("/api/products/thresholds", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          minThreshold: Number.parseInt(minThreshold),
          maxThreshold: Number.parseInt(maxThreshold),
        }),
      })

      if (response.ok) {
        toast.success("Thresholds updated successfully")
        setIsThresholdDialogOpen(false)
        setSelectedProduct(null)
        setMinThreshold("")
        setMaxThreshold("")
        // Refresh alerts to reflect new thresholds
        fetchStockAlerts()
        fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update thresholds")
      }
    } catch (error) {
      toast.error("Error updating thresholds")
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/director/stock-alerts/${alertId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isResolved: true }),
      })

      if (response.ok) {
        toast.success("Alert acknowledged. Please restock the product to resolve the issue.")
        // Remove the alert from the UI temporarily
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
        setIsViewDialogOpen(false)
      } else {
        toast.error("Failed to acknowledge alert")
      }
    } catch (error) {
      toast.error("Error acknowledging alert")
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "LOW":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case "OUT_OF_STOCK":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "LOW_STOCK":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "OVERSTOCK":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== "ALL" && alert.severity !== filterSeverity) return false
    if (filterType !== "ALL" && alert.alertType !== filterType) return false
    return !alert.isResolved
  })

  const criticalAlerts = alerts.filter((alert) => alert.severity === "CRITICAL" && !alert.isResolved)
  const highAlerts = alerts.filter((alert) => alert.severity === "HIGH" && !alert.isResolved)
  const totalActiveAlerts = alerts.filter((alert) => !alert.isResolved)

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
                <h1 className="text-2xl font-bold text-foreground">Stock Alerts</h1>
                <p className="text-muted-foreground">Real-time inventory monitoring and alerts</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchStockAlerts} className="gap-2 bg-transparent">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Alerts
                </Button>

                <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <Settings className="h-4 w-4" />
                      Set Thresholds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Set Stock Thresholds</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={updateThresholds} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select
                          value={selectedProduct?.id || ""}
                          onValueChange={(value) => {
                            const product = products.find((p) => p.id === value)
                            if (product) {
                              setSelectedProduct(product)
                              setMinThreshold((product.minStock || 10).toString())
                              setMaxThreshold((product.maxStock || 1000).toString())
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku}) - Stock: {product.quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minThreshold">Minimum Threshold</Label>
                          <Input
                            id="minThreshold"
                            type="number"
                            min="0"
                            value={minThreshold}
                            onChange={(e) => setMinThreshold(e.target.value)}
                            placeholder="Min stock"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxThreshold">Maximum Threshold</Label>
                          <Input
                            id="maxThreshold"
                            type="number"
                            min="1"
                            value={maxThreshold}
                            onChange={(e) => setMaxThreshold(e.target.value)}
                            placeholder="Max stock"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Update Thresholds
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Restock Products
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Restock Product</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRestock} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select
                          value={selectedProduct?.id || ""}
                          onValueChange={(value) => {
                            const product = products.find((p) => p.id === value)
                            setSelectedProduct(product || null)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku}) - Current: {product.quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="restockQuantity">Quantity to Add</Label>
                        <Input
                          id="restockQuantity"
                          type="number"
                          min="1"
                          value={restockQuantity}
                          onChange={(e) => setRestockQuantity(e.target.value)}
                          placeholder="Enter quantity"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Restock Product
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsRestockDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Alert Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300">Critical Alerts</p>
                      <p className="text-3xl font-bold text-red-600">{criticalAlerts.length}</p>
                      <p className="text-xs text-red-600">Immediate attention required</p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700 dark:text-orange-300">High Priority</p>
                      <p className="text-3xl font-bold text-orange-600">{highAlerts.length}</p>
                      <p className="text-xs text-orange-600">Action needed soon</p>
                    </div>
                    <TrendingDown className="h-12 w-12 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Active Alerts</p>
                      <p className="text-3xl font-bold">{totalActiveAlerts.length}</p>
                      <p className="text-xs text-muted-foreground">All unresolved issues</p>
                    </div>
                    <Bell className="h-12 w-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Products Monitored</p>
                      <p className="text-3xl font-bold">{products.length}</p>
                      <p className="text-xs text-muted-foreground">Total inventory items</p>
                    </div>
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                      <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                      <SelectItem value="OVERSTOCK">Overstock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Stock Alerts ({filteredAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Loading stock alerts...</p>
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    {alerts.length === 0
                      ? "🎉 Great! No stock alerts found. All inventory levels are within normal ranges."
                      : "No alerts match the current filters."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Thresholds</TableHead>
                          <TableHead>Alert Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAlerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{alert.productName}</p>
                                <p className="text-sm text-muted-foreground">SKU: {alert.productSku}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${alert.currentStock === 0 ? "text-red-600" : alert.currentStock <= alert.minThreshold ? "text-orange-600" : ""}`}
                                >
                                  {alert.currentStock}
                                </span>
                                {alert.currentStock === 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Empty
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>Min: {alert.minThreshold}</p>
                                <p>Max: {alert.maxThreshold}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getAlertTypeColor(alert.alertType)}>
                                {alert.alertType.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate">{alert.message}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlert(alert)
                                    setIsViewDialogOpen(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const product = products.find((p) => p.id === alert.productId)
                                    if (product) {
                                      setSelectedProduct(product)
                                      setIsRestockDialogOpen(true)
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Restock
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alert Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Alert Details</DialogTitle>
                </DialogHeader>
                {selectedAlert && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Product</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedAlert.productName}</p>
                          <p className="text-sm text-muted-foreground">SKU: {selectedAlert.productSku}</p>
                        </div>
                      </div>
                      <div>
                        <Label>Current Stock</Label>
                        <p className="text-2xl font-bold font-mono">{selectedAlert.currentStock}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Alert Type</Label>
                        <Badge className={getAlertTypeColor(selectedAlert.alertType)}>
                          {selectedAlert.alertType.replace("_", " ")}
                        </Badge>
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Badge className={getSeverityColor(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Threshold</Label>
                        <p className="font-mono">{selectedAlert.minThreshold}</p>
                      </div>
                      <div>
                        <Label>Max Threshold</Label>
                        <p className="font-mono">{selectedAlert.maxThreshold}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Alert Message</Label>
                      <p className="text-sm bg-muted p-3 rounded">{selectedAlert.message}</p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => {
                          const product = products.find((p) => p.id === selectedAlert.productId)
                          setSelectedProduct(product || null)
                          setIsViewDialogOpen(false)
                          setIsRestockDialogOpen(true)
                        }}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restock Product
                      </Button>
                      <Button onClick={() => acknowledgeAlert(selectedAlert.id)} variant="outline" className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Acknowledge Alert
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}
