"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Eye,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  product: {
    id: string
    name: string
    sku: string
    stockQuantity: number
    quantity: number
    minStockLevel: number
    minStock: number
  }
}

interface Order {
  id: string
  status: string
  totalAmount: number
  notes: string
  createdAt: string
  shippedAt?: string
  user: {
    id: string
    name: string
    email: string
  }
  items: OrderItem[]
}

interface StockValidation {
  productId: string
  productName: string
  requestedQuantity: number
  availableStock: number
  isAvailable: boolean
}

export function DirectorOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([])
  const [isShipping, setIsShipping] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      console.log("[DIRECTOR_ORDER_MANAGEMENT] Fetching orders...")
      const response = await fetch("/api/director/orders")
      if (response.ok) {
        const data = await response.json()
        console.log(`[DIRECTOR_ORDER_MANAGEMENT] Fetched ${data.length} orders`)
        setOrders(data)
      } else {
        console.error("[DIRECTOR_ORDER_MANAGEMENT] Failed to fetch orders:", response.status)
        toast.error("Failed to fetch orders")
      }
    } catch (error) {
      console.error("[DIRECTOR_ORDER_MANAGEMENT] Error fetching orders:", error)
      toast.error("Error fetching orders")
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (order: Order) => {
    console.log(`[DIRECTOR_ORDER_MANAGEMENT] Viewing order: ${order.id}`)
    setSelectedOrder(order)
    setNotes(order.notes || "")

    // Calculate stock validation with current stock levels
    const validation = order.items.map((item) => {
      const currentStock = item.product.stockQuantity || item.product.quantity || 0
      const isAvailable = currentStock >= item.quantity

      console.log(
        `[DIRECTOR_ORDER_MANAGEMENT] Stock check for ${item.product.name}: requested=${item.quantity}, available=${currentStock}, sufficient=${isAvailable}`,
      )

      return {
        productId: item.product.id,
        productName: item.product.name,
        requestedQuantity: item.quantity,
        availableStock: currentStock,
        isAvailable,
      }
    })

    setStockValidation(validation)
    setIsDetailsDialogOpen(true)
  }

  const handleUpdateOrderStatus = async (orderId: string, status: "APPROVED" | "REJECTED") => {
    console.log(`[DIRECTOR_ORDER_MANAGEMENT] Updating order ${orderId} to ${status}`)
    setIsUpdating(true)

    try {
      const response = await fetch("/api/director/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status,
          notes,
        }),
      })

      const result = await response.json()
      console.log(`[DIRECTOR_ORDER_MANAGEMENT] Update response:`, result)

      if (response.ok) {
        toast.success(`Order ${status.toLowerCase()} successfully!`)
        setIsDetailsDialogOpen(false)
        await fetchOrders()
      } else {
        console.error(`[DIRECTOR_ORDER_MANAGEMENT] Update error:`, result.error)
        toast.error(result.error || `Failed to ${status.toLowerCase()} order`)
      }
    } catch (error) {
      console.error(`[DIRECTOR_ORDER_MANAGEMENT] Error updating order:`, error)
      toast.error("Error updating order")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleShipOrder = async (orderId: string) => {
    console.log(`[DIRECTOR_ORDER_MANAGEMENT] Starting to ship order: ${orderId}`)
    setIsShipping(true)

    try {
      const response = await fetch(`/api/director/orders/${orderId}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      console.log(`[DIRECTOR_ORDER_MANAGEMENT] Ship response:`, result)

      if (response.ok) {
        toast.success("Order shipped successfully! Stock has been updated.")
        setIsDetailsDialogOpen(false)
        // Refresh orders to show updated data
        await fetchOrders()
      } else {
        if (result.outOfStockItems) {
          console.log(`[DIRECTOR_ORDER_MANAGEMENT] Out of stock items:`, result.outOfStockItems)
          toast.error("Cannot ship order - insufficient stock for some items")
          // Update stock validation with current data
          setStockValidation(result.allItems)
        } else {
          console.error(`[DIRECTOR_ORDER_MANAGEMENT] Ship error:`, result.error)
          toast.error(result.error || "Failed to ship order")
        }
      }
    } catch (error) {
      console.error(`[DIRECTOR_ORDER_MANAGEMENT] Error shipping order:`, error)
      toast.error("Error shipping order")
    } finally {
      setIsShipping(false)
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
      case "SHIPPED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const canShipOrder = (order: Order) => {
    return (
      (order.status === "APPROVED" || order.status === "PENDING") && stockValidation.every((item) => item.isAvailable)
    )
  }

  const hasStockIssues = stockValidation.some((item) => !item.isAvailable)

  if (loading) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Package className="h-5 w-5" />
                Order Management
              </CardTitle>
              <CardDescription>Review and manage customer orders for your company</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="border-border hover:bg-muted bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Order ID</TableHead>
                    <TableHead className="text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground">Items</TableHead>
                    <TableHead className="text-muted-foreground">Total</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-sm text-foreground">{order.id.slice(-8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{order.user.name}</p>
                          <p className="text-sm text-muted-foreground">{order.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-sm text-foreground">
                              {item.product.name} × {item.quantity}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-sm text-muted-foreground">+{order.items.length - 2} more</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        UGX {order.totalAmount?.toLocaleString() || "0"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrder(order)}
                          className="border-border hover:bg-muted"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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

      {/* Order Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Order Details - {selectedOrder?.id.slice(-8)}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 text-card-foreground">Customer Information</h3>
                  <p className="text-foreground">
                    <strong>Name:</strong> {selectedOrder.user.name}
                  </p>
                  <p className="text-foreground">
                    <strong>Email:</strong> {selectedOrder.user.email}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-card-foreground">Order Information</h3>
                  <p className="text-foreground">
                    <strong>Status:</strong> {selectedOrder.status}
                  </p>
                  <p className="text-foreground">
                    <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                  {selectedOrder.shippedAt && (
                    <p className="text-foreground">
                      <strong>Shipped:</strong> {new Date(selectedOrder.shippedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Validation Alert */}
              {hasStockIssues && (
                <Alert variant="destructive" className="border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Stock Issues Detected:</strong> Some items in this order have insufficient stock. Please add
                    stock before shipping.
                  </AlertDescription>
                </Alert>
              )}

              {/* Order Items with Stock Status */}
              <div>
                <h3 className="font-semibold mb-4 text-card-foreground">Order Items & Stock Status</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Product</TableHead>
                      <TableHead className="text-muted-foreground">SKU</TableHead>
                      <TableHead className="text-muted-foreground">Requested</TableHead>
                      <TableHead className="text-muted-foreground">Available Stock</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Unit Price</TableHead>
                      <TableHead className="text-muted-foreground">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockValidation.map((item, index) => (
                      <TableRow
                        key={item.productId}
                        className={`border-border hover:bg-muted/50 ${!item.isAvailable ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                      >
                        <TableCell className="font-medium text-foreground">{item.productName}</TableCell>
                        <TableCell className="font-mono text-sm text-foreground">
                          {selectedOrder.items[index]?.product.sku}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{item.requestedQuantity}</TableCell>
                        <TableCell
                          className={
                            item.availableStock < item.requestedQuantity
                              ? "text-red-600 font-semibold"
                              : "text-foreground"
                          }
                        >
                          {item.availableStock}
                        </TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Insufficient
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground">
                          UGX {selectedOrder.items[index]?.unitPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-foreground">
                          UGX {(selectedOrder.items[index]?.unitPrice * item.requestedQuantity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Notes Section */}
              <div>
                <Label htmlFor="notes" className="text-card-foreground">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  className="mt-2 bg-background border-border"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsDialogOpen(false)}
                  className="border-border hover:bg-muted"
                >
                  Close
                </Button>

                {selectedOrder.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, "REJECTED")}
                      disabled={isUpdating}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 bg-transparent"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      {isUpdating ? "Rejecting..." : "Reject Order"}
                    </Button>
                    <Button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, "APPROVED")}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      {isUpdating ? "Approving..." : "Approve Order"}
                    </Button>
                  </>
                )}

                {(selectedOrder.status === "APPROVED" || selectedOrder.status === "PENDING") && (
                  <Button
                    onClick={() => handleShipOrder(selectedOrder.id)}
                    disabled={!canShipOrder(selectedOrder) || isShipping}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {isShipping ? "Shipping..." : "Ship Order"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
