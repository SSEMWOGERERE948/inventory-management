"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  Eye,
  Filter,
  Download,
  TrendingUp,
  AlertTriangle,
  Users,
  UserCheck,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Payment {
  id: string
  amount: number
  description: string
  receiptUrl?: string
  paymentDate: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  isFromCredit: boolean
  creditAmount: number
}

interface UserBalance {
  userId: string
  userName: string
  userEmail: string
  totalOrderAmount: number
  totalPayments: number
  outstandingBalance: number
  ordersCount: number
  paymentsCount: number
}

interface CompanyBalances {
  userBalances: UserBalance[]
  companyTotals: {
    totalOrderAmount: number
    totalPayments: number
    totalOutstanding: number
  }
}

interface CustomerDebt {
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

interface CustomerDebtsResponse {
  user: {
    id: string
    name: string
    email: string
  }
  customers: CustomerDebt[]
  totals: {
    totalCustomers: number
    totalOutstanding: number
    totalCredit: number
    totalPaid: number
  }
}

export default function DirectorPaymentsPage() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [companyBalances, setCompanyBalances] = useState<CompanyBalances | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCustomerDebtsDialogOpen, setIsCustomerDebtsDialogOpen] = useState(false)
  const [customerDebts, setCustomerDebts] = useState<CustomerDebtsResponse | null>(null)
  const [loadingCustomerDebts, setLoadingCustomerDebts] = useState(false)

  // Filters
  const [userFilter, setUserFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    if (session?.user?.role === "COMPANY_DIRECTOR") {
      fetchPayments()
      fetchCompanyBalances()
    }
  }, [session])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/director/payments")
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast.error("Failed to fetch payments")
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyBalances = async () => {
    try {
      const response = await fetch("/api/director/balances")
      if (response.ok) {
        const data = await response.json()
        setCompanyBalances(data)
      }
    } catch (error) {
      console.error("Error fetching company balances:", error)
    }
  }

  const fetchCustomerDebts = async (userId: string) => {
    setLoadingCustomerDebts(true)
    try {
      const response = await fetch(`/api/director/users/${userId}/customer-debts`)
      if (response.ok) {
        const data = await response.json()
        setCustomerDebts(data)
        setIsCustomerDebtsDialogOpen(true)
      } else {
        toast.error("Failed to fetch customer debts")
      }
    } catch (error) {
      console.error("Error fetching customer debts:", error)
      toast.error("Error fetching customer debts")
    } finally {
      setLoadingCustomerDebts(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (userFilter && !payment.user.name.toLowerCase().includes(userFilter.toLowerCase())) return false
    if (dateFilter && !payment.paymentDate.startsWith(dateFilter)) return false
    return true
  })

  const getTotalPayments = (): number => {
    if (filteredPayments.length === 0) return 0

    return filteredPayments.reduce((total, payment) => {
      const amount = Number(payment.amount)
      return total + (isNaN(amount) ? 0 : amount)
    }, 0)
  }

  const getMonthlyData = () => {
    const monthlyTotals: { [key: string]: number } = {}
    filteredPayments.forEach((payment) => {
      const amount = Number(payment.amount)
      if (!isNaN(amount)) {
        const month = format(new Date(payment.paymentDate), "yyyy-MM")
        monthlyTotals[month] = (monthlyTotals[month] || 0) + amount
      }
    })

    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, total]) => ({
        name: format(new Date(month + "-01"), "MMM yyyy"),
        amount: total,
      }))
  }

  const getThisMonthTotal = (): number => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    return filteredPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate)
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
      })
      .reduce((sum, p) => {
        const amount = Number(p.amount)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
  }

  const exportPayments = () => {
    const csvContent = [
      ["Date", "User", "Description", "Amount"],
      ...filteredPayments.map((payment) => [
        format(new Date(payment.paymentDate), "yyyy-MM-dd"),
        payment.user.name,
        payment.description,
        payment.amount.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number): string => {
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
      return "UGX 0.00"
    }
    return `UGX ${amount.toLocaleString()}`
  }

  if (!session) {
    return <div className="flex items-center justify-center h-64">Please sign in</div>
  }

  if (session.user.role !== "COMPANY_DIRECTOR") {
    return <div className="text-center py-8">Access denied. Director role required.</div>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading payments...</div>
  }

  const user = {
    name: session.user.name || "Director",
    email: session.user.email || "",
    role: session.user.role || "COMPANY_DIRECTOR",
    companyName: session.user.companyName || "Your Company",
  }

  const monthlyData = getMonthlyData()
  const thisMonthTotal = getThisMonthTotal()
  const usersWithOutstanding = companyBalances?.userBalances.filter((u) => u.outstandingBalance > 0) || []

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
                <h1 className="text-3xl font-bold">Company Payments</h1>
                <p className="text-muted-foreground">Monitor and track company payment records</p>
              </div>

              <Button onClick={exportPayments} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-3xl font-bold">{formatCurrency(getTotalPayments())}</p>
                    </div>
                    <CreditCard className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-3xl font-bold">{formatCurrency(thisMonthTotal)}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300">Outstanding Balance</p>
                      <p className="text-3xl font-bold text-red-600">
                        {formatCurrency(companyBalances?.companyTotals.totalOutstanding || 0)}
                      </p>
                      <p className="text-xs text-red-600">{usersWithOutstanding.length} users owe money</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Total Records</p>
                    <p className="text-3xl font-bold">{filteredPayments.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Outstanding Balances */}
            {usersWithOutstanding.length > 0 && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <Users className="h-5 w-5" />
                    Users with Outstanding Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Payments</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersWithOutstanding.map((userBalance) => (
                          <TableRow key={userBalance.userId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{userBalance.userName}</p>
                                <p className="text-sm text-muted-foreground">{userBalance.userEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(userBalance.totalOrderAmount)}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(userBalance.totalPayments)}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatCurrency(userBalance.outstandingBalance)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">Payment Required</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchCustomerDebts(userBalance.userId)}
                                disabled={loadingCustomerDebts}
                                className="gap-2"
                              >
                                <UserCheck className="h-4 w-4" />
                                View Customer Debts
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>User</Label>
                    <Input
                      placeholder="Search by user name"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Month</Label>
                    <Input type="month" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUserFilter("")
                        setDateFilter("")
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No payments found matching your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Payment Type</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{payment.user.name}</p>
                                <p className="text-sm text-muted-foreground">{payment.user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{payment.description}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(Number(payment.amount))}</TableCell>
                            <TableCell>
                              {payment.receiptUrl ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">No receipt</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment.isFromCredit ? (
                                <div>
                                  <Badge variant="secondary">Credit Payment</Badge>
                                  {payment.creditAmount > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Credit: {formatCurrency(Number(payment.creditAmount))}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="outline">Regular</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment)
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Details
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

            {/* Payment Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Payment Details</DialogTitle>
                </DialogHeader>
                {selectedPayment && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Submitted By</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedPayment.user.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedPayment.user.email}</p>
                        </div>
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <p className="text-2xl font-bold">{formatCurrency(Number(selectedPayment.amount))}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <p className="text-sm bg-muted p-3 rounded">{selectedPayment.description}</p>
                    </div>

                    <div>
                      <Label>Payment Date</Label>
                      <p>{format(new Date(selectedPayment.paymentDate), "PPP")}</p>
                    </div>

                    {selectedPayment?.isFromCredit && (
                      <div>
                        <Label>Payment Type</Label>
                        <div className="mt-1">
                          <Badge variant="secondary">Credit Payment</Badge>
                          {selectedPayment.creditAmount > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Credit Amount: {formatCurrency(Number(selectedPayment.creditAmount))}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedPayment.receiptUrl && (
                      <div>
                        <Label>Receipt</Label>
                        <div className="mt-2">
                          <img
                            src={selectedPayment.receiptUrl || "/placeholder.svg"}
                            alt="Receipt"
                            className="max-w-full h-auto rounded-lg border"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Submitted On</Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedPayment.createdAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Customer Debts Dialog */}
            <Dialog open={isCustomerDebtsDialogOpen} onOpenChange={setIsCustomerDebtsDialogOpen}>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Customer Debts - {customerDebts?.user.name}
                  </DialogTitle>
                </DialogHeader>
                {loadingCustomerDebts ? (
                  <div className="text-center py-8">Loading customer debts...</div>
                ) : customerDebts ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Customers</p>
                            <p className="text-2xl font-bold">{customerDebts.totals.totalCustomers}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Credit Given</p>
                            <p className="text-2xl font-bold">{formatCurrency(customerDebts.totals.totalCredit)}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(customerDebts.totals.totalPaid)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-red-700 dark:text-red-300">Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(customerDebts.totals.totalOutstanding)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Customer Debts Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Customers with Outstanding Balances ({customerDebts.customers.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {customerDebts.customers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No customers with outstanding balances found.</p>
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
                                  <TableHead>Orders/Payments</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {customerDebts.customers.map((customer) => (
                                  <TableRow key={customer.id}>
                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{customer.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Added {format(new Date(customer.createdAt), "MMM dd, yyyy")}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        {customer.phone && <p>{customer.phone}</p>}
                                        {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                                        {customer.address && (
                                          <p className="text-muted-foreground text-xs">{customer.address}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      {formatCurrency(customer.totalCredit)}
                                    </TableCell>
                                    <TableCell className="text-green-600">
                                      {formatCurrency(customer.totalPaid)}
                                    </TableCell>
                                    <TableCell className="font-semibold text-red-600">
                                      {formatCurrency(customer.outstandingBalance)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <p>{customer._count.orders} orders</p>
                                        <p className="text-muted-foreground">{customer._count.payments} payments</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="destructive">Owes Money</Badge>
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
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}
