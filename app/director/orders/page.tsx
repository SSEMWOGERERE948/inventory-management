"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ShoppingCart, Clock, CheckCircle, XCircle, Truck, Package, RefreshCw, Bug } from "lucide-react"

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: {
    id: string
    name: string
    sku: string
  }
}

interface Order {
  id: string
  status: string
  totalAmount: number
  notes: string
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
  fulfilledAt?: string
  shippedAt?: string
  user: {
    id: string
    name: string
    email: string
  }
  items: OrderItem[]
}

interface DebugInfo {
  session: any
  ordersSummary: {
    total: number
    byCompany: Record<string, number>
    byStatus: Record<string, number>
  }
}

const DirectorOrdersPage: React.FC = () => {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [notes, setNotes] = useState("")
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    if (session) {
      console.log("Director Orders - Session user:", session.user)
      fetchOrders()
    }
  }, [session])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      console.log("🔄 Fetching director orders...")
      const response = await fetch("/api/director/orders", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Director API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Director orders fetched:", data.length, "orders")
        setOrders(data)
      } else {
        const errorText = await response.text()
        console.error("❌ Director API Error:", errorText)
        toast.error(`Failed to fetch orders: ${response.status}`)
      }
    } catch (error) {
      console.error("💥 Director orders fetch error:", error)
      toast.error("Error fetching orders")
    } finally {
      setLoading(false)
    }
  }

  const fetchDebugInfo = async () => {
    try {
      const [sessionRes, ordersRes] = await Promise.all([fetch("/api/debug/session"), fetch("/api/debug/orders")])

      const sessionData = sessionRes.ok ? await sessionRes.json() : null
      const ordersData = ordersRes.ok ? await ordersRes.json() : null

      setDebugInfo({
        session: sessionData,
        ordersSummary: ordersData || { total: 0, byCompany: {}, byStatus: {} },
      })
      setShowDebug(true)
    } catch (error) {
      console.error("Debug info fetch error:", error)
      toast.error("Failed to fetch debug info")
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    try {
      console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`)

      const response = await fetch("/api/director/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          status: newStatus,
          notes: notes || undefined,
        }),
      })

      console.log("📡 Update Response:", {
        status: response.status,
        statusText: response.statusText,
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        console.log("✅ Order updated successfully:", updatedOrder.id)

        setOrders(orders.map((order) => (order.id === orderId ? updatedOrder : order)))

        toast.success(`Order ${newStatus.toLowerCase()} successfully`)
        setSelectedOrder(null)
        setNotes("")
      } else {
        const errorData = await response.json()
        console.error("❌ Update error:", errorData)
        toast.error(errorData.error || "Failed to update order")
      }
    } catch (error) {
      console.error("💥 Update order error:", error)
      toast.error("Error updating order")
    } finally {
      setUpdating(null)
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
        return <Package className="h-4 w-4 text-blue-500" />
      case "SHIPPED":
        return <Truck className="h-4 w-4 text-purple-500" />
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
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const formatCurrency = (amount: number | undefined | null): string => {
    const numAmount = Number(amount)
    if (amount === undefined || amount === null || isNaN(numAmount) || !isFinite(numAmount)) {
      return "UGX 0.00"
    }
    return `UGX ${numAmount.toLocaleString()}`
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!session) {
    return <div className="flex items-center justify-center h-screen">Please sign in</div>
  }

  const user = {
    name: session.user.name || "Director",
    email: session.user.email || "",
    role: session.user.role || "COMPANY_DIRECTOR",
    companyName: session.user.companyName || "Your Company",
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={session.user.role || "COMPANY_DIRECTOR"}
        companyName={session.user.companyName || "Your Company"}
      />
      <MobileSidebar
        userRole={session.user.role || "COMPANY_DIRECTOR"}
        companyName={session.user.companyName || "Your Company"}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
                <p className="text-muted-foreground">Review and manage order requests from your team</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={fetchOrders} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={fetchDebugInfo} variant="outline" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Info
                </Button>
              </div>
            </div>

            {/* Debug Info Card */}
            {showDebug && debugInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Session Info:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(debugInfo.session, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold">Orders Summary:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(debugInfo.ordersSummary, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <Button onClick={() => setShowDebug(false)} variant="outline" size="sm" className="mt-4">
                    Hide Debug
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Requests ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No order requests found.</p>
                    <p className="text-sm">Orders from your team will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Requested By</TableHead>
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
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
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
                              <div className="flex gap-2">
                                {order.status === "PENDING" && (
                                  <>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => setSelectedOrder(order)}
                                          disabled={updating === order.id}
                                        >
                                          Approve
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Approve Order</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <p>Are you sure you want to approve this order?</p>
                                          <div>
                                            <Label htmlFor="notes">Notes (Optional)</Label>
                                            <Textarea
                                              id="notes"
                                              value={notes}
                                              onChange={(e) => setNotes(e.target.value)}
                                              placeholder="Add any notes..."
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => updateOrderStatus(order.id, "APPROVED")}
                                              disabled={updating === order.id}
                                            >
                                              {updating === order.id ? "Approving..." : "Approve"}
                                            </Button>
                                            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => setSelectedOrder(order)}
                                          disabled={updating === order.id}
                                        >
                                          Reject
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Reject Order</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <p>Are you sure you want to reject this order?</p>
                                          <div>
                                            <Label htmlFor="reject-notes">Reason for rejection</Label>
                                            <Textarea
                                              id="reject-notes"
                                              value={notes}
                                              onChange={(e) => setNotes(e.target.value)}
                                              placeholder="Please provide a reason for rejection..."
                                              required
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="destructive"
                                              onClick={() => updateOrderStatus(order.id, "REJECTED")}
                                              disabled={updating === order.id || !notes.trim()}
                                            >
                                              {updating === order.id ? "Rejecting..." : "Reject"}
                                            </Button>
                                            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </>
                                )}

                                {order.status === "APPROVED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateOrderStatus(order.id, "FULFILLED")}
                                    disabled={updating === order.id}
                                  >
                                    {updating === order.id ? "Processing..." : "Mark Fulfilled"}
                                  </Button>
                                )}

                                {order.status === "FULFILLED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateOrderStatus(order.id, "SHIPPED")}
                                    disabled={updating === order.id}
                                  >
                                    {updating === order.id ? "Processing..." : "Mark Shipped"}
                                  </Button>
                                )}
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
          </div>
        </main>
      </div>
    </div>
  )
}

export default DirectorOrdersPage
