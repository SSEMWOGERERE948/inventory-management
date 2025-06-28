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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck, AlertTriangle, RefreshCw, Bug } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
}

interface Order {
  id: string
  status: string
  totalAmount: number
  notes: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    product: {
      id: string
      name: string
      sku: string
    }
  }>
}

const DirectorOrdersPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [restockQuantity, setRestockQuantity] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const mockUser = {
    name: "Director Smith",
    email: "director@demo.com",
    role: "COMPANY_DIRECTOR",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchOrders()
    fetchProducts()
  }, [])



  const fetchOrders = async () => {
    try {
      console.log("📋 Fetching orders from /api/director/orders...")
      setLoading(true)

      const response = await fetch("/api/director/orders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      console.log("Orders API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Orders data received:", data)
        console.log("Number of orders:", data.length)
        setOrders(data)
      } else {
        const errorText = await response.text()
        console.error("❌ Failed to fetch orders:", response.status, errorText)

        // Try user API for comparison
        console.log("🔄 Trying user API for comparison...")
        try {
          const userResponse = await fetch("/api/user/orders", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (userResponse.ok) {
            const userData = await userResponse.json()
            console.log("👤 User orders data (for comparison):", userData)
            console.log("User orders count:", userData.length)
          } else {
            console.log("❌ User API also failed:", userResponse.status)
          }
        } catch (userError) {
          console.error("Error testing user API:", userError)
        }

        toast.error(`Failed to fetch orders: ${response.status}`)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Error fetching orders")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      console.log("📦 Fetching products from /api/products...")

      const response = await fetch("/api/products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      console.log("Products API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Products data received:", data)
        console.log("Number of products:", data.length)
        setProducts(data)
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch products:", response.status, errorText)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const handleOrderAction = async (orderId: string, status: string, notes?: string) => {
    try {
      console.log("Updating order:", orderId, "to status:", status)

      const response = await fetch("/api/director/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          status,
          notes,
        }),
      })

      if (response.ok) {
        toast.success(`Order ${status.toLowerCase()} successfully`)
        fetchOrders()
        setIsViewDialogOpen(false)
      } else {
        const error = await response.json()
        console.error("Failed to update order:", error)
        toast.error(error.error || "Failed to update order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast.error("Error updating order")
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
        credentials: "include",
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
        fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to restock product")
      }
    } catch (error) {
      toast.error("Error restocking product")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "FULFILLED":
      case "SHIPPED":
        return <Truck className="h-4 w-4 text-blue-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "FULFILLED":
      case "SHIPPED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const lowStockProducts = products.filter((product) => product.quantity < 10)

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
                <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
                <p className="text-muted-foreground">Review and manage order requests</p>
              </div>
            </div>

            {/* Debug Info Card */}
            {debugInfo && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Bug className="h-5 w-5" />
                    Debug Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold">Session Info:</h4>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(debugInfo.session, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold">Orders Summary:</h4>
                      <p>Total orders in database: {debugInfo.orders?.totalOrders || 0}</p>
                      <p>Companies with orders: {Object.keys(debugInfo.orders?.ordersByCompany || {}).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600 dark:text-red-400 mb-2">
                    {lowStockProducts.length} product(s) are running low on stock:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lowStockProducts.map((product) => (
                      <Badge key={product.id} variant="destructive">
                        {product.name} ({product.quantity} left)
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Loading orders...</p>
                    <p className="text-sm text-muted-foreground">Fetching order data from the database</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No orders found</h3>
                    <p className="text-muted-foreground mb-4">There are no order requests for your company yet.</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Orders will appear here once users from your company submit requests</p>
                      <p>• You can approve, reject, or fulfill orders from this page</p>
                      <p>• Use the refresh button to check for new orders</p>
                      <p>• Click "Debug Info" to see detailed debugging information</p>
                      <p>• Check the browser console for detailed API logs</p>
                    </div>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button variant="outline" onClick={fetchOrders} className="bg-transparent">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Orders
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.id.slice(-8)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.user.name}</p>
                                <p className="text-sm text-muted-foreground">{order.user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.items.map((item, index) => (
                                  <div key={index} className="text-sm">
                                    {item.product.name} × {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>ugx{Number(order.totalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setOrderNotes("")
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Review Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Review Order</DialogTitle>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Order ID</Label>
                        <p className="font-mono">{selectedOrder.id}</p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Badge className={getStatusColor(selectedOrder.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(selectedOrder.status)}
                            {selectedOrder.status}
                          </div>
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Requested By</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedOrder.user.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedOrder.user.email}</p>
                        </div>
                      </div>
                      <div>
                        <Label>Total Amount</Label>
                        <p className="text-2xl font-bold">ugx{Number(selectedOrder.totalAmount).toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Order Items</Label>
                      <div className="mt-2 space-y-2">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                            </div>
                            <div className="text-right">
                              <p>Qty: {item.quantity}</p>
                              <p className="text-sm">ugx{Number(item.totalPrice).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedOrder.notes && (
                      <div>
                        <Label>Order Notes</Label>
                        <p className="text-sm bg-muted p-3 rounded">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <div>
                      <Label>Order Date</Label>
                      <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>

                    {selectedOrder.status === "PENDING" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="orderNotes">Notes (Optional)</Label>
                          <Textarea
                            id="orderNotes"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Add notes for approval/rejection..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOrderAction(selectedOrder.id, "APPROVED", orderNotes)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Order
                          </Button>
                          <Button
                            onClick={() => handleOrderAction(selectedOrder.id, "REJECTED", orderNotes)}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Order
                          </Button>
                        </div>
                      </>
                    )}

                    {selectedOrder.status === "APPROVED" && (
                      <Button
                        onClick={() => handleOrderAction(selectedOrder.id, "FULFILLED", orderNotes)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Mark as Fulfilled
                      </Button>
                    )}
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

export default DirectorOrdersPage
