"use client"

import { useEffect, useState } from "react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreditCard, Eye, Filter, Download, TrendingUp } from "lucide-react"
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
}

export default function DirectorPaymentsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Filters
  const [userFilter, setUserFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const mockUser = {
    name: "Director Smith",
    email: "director@demo.com",
    role: "COMPANY_DIRECTOR",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchPayments()
  }, [])

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

  const filteredPayments = payments.filter((payment) => {
    if (userFilter && !payment.user.name.toLowerCase().includes(userFilter.toLowerCase())) return false
    if (dateFilter && !payment.paymentDate.startsWith(dateFilter)) return false
    return true
  })

  const getTotalPayments = () => {
    return filteredPayments.reduce((total, payment) => total + payment.amount, 0)
  }

  const getMonthlyData = () => {
    const monthlyTotals: { [key: string]: number } = {}

    filteredPayments.forEach((payment) => {
      const month = format(new Date(payment.paymentDate), "yyyy-MM")
      monthlyTotals[month] = (monthlyTotals[month] || 0) + payment.amount
    })

    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, total]) => ({
        name: format(new Date(month + "-01"), "MMM yyyy"),
        amount: total,
      }))
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading payments...</div>
  }

  const monthlyData = getMonthlyData()
  const thisMonthTotal = filteredPayments
    .filter((p) => new Date(p.paymentDate).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0)

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
                <h1 className="text-3xl font-bold">Company Payments</h1>
                <p className="text-muted-foreground">Monitor and track company payment records</p>
              </div>
              <Button onClick={exportPayments} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-3xl font-bold">ugx{getTotalPayments().toFixed(2)}</p>
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
                      <p className="text-3xl font-bold">ugx{thisMonthTotal.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-600" />
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
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Amount"]} />
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
                            <TableCell className="font-semibold">ugx{payment.amount.toFixed(2)}</TableCell>
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
                        <p className="text-2xl font-bold">ugx{selectedPayment.amount.toFixed(2)}</p>
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
          </div>
        </main>
      </div>
    </div>
  )
}
