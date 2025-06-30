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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ShoppingCart, Plus, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
}

interface OrderItem {
  productId: string
  quantity: number
  product?: Product
}

interface Order {
  id: string
  status: string
  totalAmount?: number // Made optional since it might be undefined
  notes: string
  createdAt: string
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

export default function UserOrdersPage() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ productId: "", quantity: 1 }])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (session) {
      fetchOrders()
      fetchProducts()
    }
  }, [session])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/user/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      } else {
        toast.error("Failed to fetch orders")
      }
    } catch (error) {
      toast.error("Error fetching orders")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/user/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = orderItems.filter((item) => item.productId && item.quantity > 0)

    if (validItems.length === 0) {
      toast.error("Please add at least one item to your order")
      return
    }

    try {
      const response = await fetch("/api/user/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: validItems,
          notes,
        }),
      })

      if (response.ok) {
        toast.success("Order request submitted successfully")
        setIsCreateDialogOpen(false)
        setOrderItems([{ productId: "", quantity: 1 }])
        setNotes("")
        fetchOrders()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create order")
      }
    } catch (error) {
      toast.error("Error creating order")
    }
  }

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: "", quantity: 1 }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...orderItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setOrderItems(newItems)
  }

  // Helper function to calculate total amount if not provided
  const calculateOrderTotal = (order: Order): number => {
    if (order.totalAmount !== undefined && order.totalAmount !== null) {
      return order.totalAmount
    }

    // Calculate from items if totalAmount is not available
    return order.items.reduce((total, item) => {
      return total + (item.totalPrice || item.unitPrice * item.quantity || 0)
    }, 0)
  }

  // Helper function to safely format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    // Convert to number and check if valid
    const numAmount = Number(amount)
    if (amount === undefined || amount === null || isNaN(numAmount) || !isFinite(numAmount)) {
      return "UGX 0.00"
    }
    return `UGX ${numAmount.toLocaleString()}`
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
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole="USER" companyName="Your Company" />
        <MobileSidebar
          userRole="USER"
          companyName="Your Company"
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={{
              name: "User",
              email: "",
              role: "USER",
              companyName: "Your Company",
            }}
            onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-center h-64">Please sign in to view orders</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Create user object from session
  const user = {
    name: session.user?.name || "User",
    email: session.user?.email || "",
    role: (session.user?.role as string) || "USER",
    companyName: (session.user?.companyName as string) || "Your Company",
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user.role} companyName={user.companyName} />
      <MobileSidebar
        userRole={user.role}
        companyName={user.companyName}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
                <p className="text-muted-foreground">Track and manage your order requests</p>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Order</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Order Items</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                          Add Item
                        </Button>
                      </div>

                      {orderItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label>Product</Label>
                            <select
                              className="w-full p-2 border border-border rounded-md bg-background"
                              value={item.productId}
                              onChange={(e) => updateOrderItem(index, "productId", e.target.value)}
                              required
                            >
                              <option value="">Select a product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku}) - UGX {product.price.toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, "quantity", Number.parseInt(e.target.value))}
                              required
                            />
                          </div>

                          {orderItems.length > 1 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => removeOrderItem(index)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any special instructions or notes..."
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Submit Order Request
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found. Create your first order to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.id.slice(-8)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.items.map((item, index) => (
                                  <div key={index} className="text-sm">
                                    {item.product.name} × {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(calculateOrderTotal(order))}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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
