"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, Plus, CreditCard, DollarSign, AlertTriangle, ShoppingCart, Receipt } from "lucide-react"

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  totalCredit: number
  totalPaid: number
  outstandingBalance: number
  createdAt: string
  _count: {
    orders: number
    payments: number
  }
}

interface Product {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] = useState(false)
  const [isAddOrderDialogOpen, setIsAddOrderDialogOpen] = useState(false)
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")

  // Order form states
  const [selectedProductId, setSelectedProductId] = useState("")
  const [orderQuantity, setOrderQuantity] = useState("")
  const [orderUnitPrice, setOrderUnitPrice] = useState("")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0])

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDescription, setPaymentDescription] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (session) {
      fetchCustomers()
      fetchProducts()
    }
  }, [session])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/user/customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      } else {
        toast.error("Failed to fetch customers")
      }
    } catch (error) {
      toast.error("Error fetching customers")
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

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName) {
      toast.error("Customer name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/user/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: customerAddress,
        }),
      })

      if (response.ok) {
        toast.success("Customer created successfully")
        setIsCreateCustomerDialogOpen(false)
        resetCustomerForm()
        fetchCustomers()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create customer")
      }
    } catch (error) {
      toast.error("Error creating customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !selectedProductId || !orderQuantity || !orderUnitPrice) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/user/customers/${selectedCustomer.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: Number.parseInt(orderQuantity),
          unitPrice: Number.parseFloat(orderUnitPrice),
          orderDate,
        }),
      })

      if (response.ok) {
        toast.success("Credit order added successfully")
        setIsAddOrderDialogOpen(false)
        resetOrderForm()
        fetchCustomers()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add order")
      }
    } catch (error) {
      toast.error("Error adding order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !paymentAmount) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/user/customers/${selectedCustomer.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseFloat(paymentAmount),
          description: paymentDescription,
          paymentDate,
        }),
      })

      if (response.ok) {
        toast.success("Payment recorded successfully")
        setIsAddPaymentDialogOpen(false)
        resetPaymentForm()
        fetchCustomers()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to record payment")
      }
    } catch (error) {
      toast.error("Error recording payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCustomerForm = () => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setCustomerAddress("")
  }

  const resetOrderForm = () => {
    setSelectedProductId("")
    setOrderQuantity("")
    setOrderUnitPrice("")
    setOrderDate(new Date().toISOString().split("T")[0])
  }

  const resetPaymentForm = () => {
    setPaymentAmount("")
    setPaymentDescription("")
    setPaymentDate(new Date().toISOString().split("T")[0])
  }

  const formatCurrency = (amount: number): string => {
    return `UGX ${amount.toLocaleString()}`
  }

  const getTotalOutstanding = (): number => {
    return customers.reduce((total, customer) => total + customer.outstandingBalance, 0)
  }

  const getTotalCredit = (): number => {
    return customers.reduce((total, customer) => total + customer.totalCredit, 0)
  }

  const getTotalPaid = (): number => {
    return customers.reduce((total, customer) => total + customer.totalPaid, 0)
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!session) {
    return <div className="flex items-center justify-center h-screen">Please sign in</div>
  }

  const user = {
    name: session.user?.name || "User",
    email: session.user?.email || "",
    role: (session.user?.role as string) || "USER",
    companyName: (session.user?.companyId as string) || "Your Company",
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={(session.user?.role as string) || "USER"}
        companyName={(session.user?.companyId as string) || "Your Company"}
      />
      <MobileSidebar
        userRole={(session.user?.role as string) || "USER"}
        companyName={(session.user?.companyId as string) || "Your Company"}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Customer Credit Management</h1>
                <p className="text-muted-foreground">Manage customers who buy on credit and track payments</p>
              </div>

              <div className="flex gap-2">
                <Dialog open={isCreateCustomerDialogOpen} onOpenChange={setIsCreateCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCustomer} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">Phone Number</Label>
                        <Input
                          id="customerPhone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerAddress">Address</Label>
                        <Textarea
                          id="customerAddress"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Enter customer address"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Customer"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-3xl font-bold">{customers.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credit Given</p>
                      <p className="text-3xl font-bold">{formatCurrency(getTotalCredit())}</p>
                    </div>
                    <CreditCard className="w-12 h-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(getTotalPaid())}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300">Outstanding Balance</p>
                      <p className="text-3xl font-bold text-red-600">{formatCurrency(getTotalOutstanding())}</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers ({customers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No customers found.</p>
                    <p className="text-sm">Add your first customer to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Total Credit</TableHead>
                          <TableHead>Total Paid</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {customer._count.orders} orders, {customer._count.payments} payments
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {customer.phone && <p>{customer.phone}</p>}
                                {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(customer.totalCredit)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(customer.totalPaid)}</TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatCurrency(customer.outstandingBalance)}
                            </TableCell>
                            <TableCell>
                              {customer.outstandingBalance > 0 ? (
                                <Badge variant="destructive">Has Debt</Badge>
                              ) : (
                                <Badge variant="default">Paid Up</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog open={isAddOrderDialogOpen} onOpenChange={setIsAddOrderDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(customer)}>
                                      <ShoppingCart className="h-4 w-4 mr-1" />
                                      Add Order
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Add Credit Order for {selectedCustomer?.name}</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddOrder} className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="product">Product *</Label>
                                        <select
                                          id="product"
                                          value={selectedProductId}
                                          onChange={(e) => {
                                            setSelectedProductId(e.target.value)
                                            const product = products.find((p) => p.id === e.target.value)
                                            if (product) {
                                              setOrderUnitPrice(product.price.toString())
                                            }
                                          }}
                                          className="w-full p-2 border rounded-md"
                                          required
                                        >
                                          <option value="">Select a product</option>
                                          {products
                                            .filter((p) => p.quantity > 0)
                                            .map((product) => (
                                              <option key={product.id} value={product.id}>
                                                {product.name} ({product.sku}) - Stock: {product.quantity}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="quantity">Quantity *</Label>
                                          <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={orderQuantity}
                                            onChange={(e) => setOrderQuantity(e.target.value)}
                                            required
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="unitPrice">Unit Price *</Label>
                                          <Input
                                            id="unitPrice"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={orderUnitPrice}
                                            onChange={(e) => setOrderUnitPrice(e.target.value)}
                                            required
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="orderDate">Order Date *</Label>
                                        <Input
                                          id="orderDate"
                                          type="date"
                                          value={orderDate}
                                          onChange={(e) => setOrderDate(e.target.value)}
                                          required
                                        />
                                      </div>
                                      {orderQuantity && orderUnitPrice && (
                                        <div className="p-3 bg-muted rounded">
                                          <p className="text-sm font-medium">
                                            Total: {formatCurrency(Number(orderQuantity) * Number(orderUnitPrice))}
                                          </p>
                                        </div>
                                      )}
                                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Adding..." : "Add Credit Order"}
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={isAddPaymentDialogOpen} onOpenChange={setIsAddPaymentDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedCustomer(customer)}
                                      disabled={customer.outstandingBalance <= 0}
                                    >
                                      <Receipt className="h-4 w-4 mr-1" />
                                      Record Payment
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Record Payment from {selectedCustomer?.name}</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleAddPayment} className="space-y-4">
                                      <div className="p-3 bg-muted rounded">
                                        <p className="text-sm">
                                          Outstanding Balance:{" "}
                                          <span className="font-semibold text-red-600">
                                            {formatCurrency(selectedCustomer?.outstandingBalance || 0)}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="paymentAmount">Payment Amount *</Label>
                                        <Input
                                          id="paymentAmount"
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max={selectedCustomer?.outstandingBalance || 0}
                                          value={paymentAmount}
                                          onChange={(e) => setPaymentAmount(e.target.value)}
                                          placeholder="0.00"
                                          required
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="paymentDescription">Description</Label>
                                        <Textarea
                                          id="paymentDescription"
                                          value={paymentDescription}
                                          onChange={(e) => setPaymentDescription(e.target.value)}
                                          placeholder="Payment details..."
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="paymentDate">Payment Date *</Label>
                                        <Input
                                          id="paymentDate"
                                          type="date"
                                          value={paymentDate}
                                          onChange={(e) => setPaymentDate(e.target.value)}
                                          required
                                        />
                                      </div>
                                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? "Recording..." : "Record Payment"}
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
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
