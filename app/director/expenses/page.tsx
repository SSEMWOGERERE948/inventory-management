"use client"

import { useEffect, useState } from "react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Receipt, Eye, Filter, Download } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Expense {
  id: string
  amount: number
  description: string
  category?: string
  receiptUrl?: string
  expenseDate: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Travel",
  "Meals & Entertainment",
  "Equipment",
  "Software",
  "Training",
  "Marketing",
  "Utilities",
  "Other",
]

export default function DirectorExpensesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("All categories")
  const [userFilter, setUserFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const mockUser = {
    name: "Director Smith",
    email: "director@demo.com",
    role: "COMPANY_DIRECTOR",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/director/expenses")
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to fetch expenses")
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    if (categoryFilter !== "All categories" && expense.category !== categoryFilter) return false
    if (userFilter && !expense.user.name.toLowerCase().includes(userFilter.toLowerCase())) return false
    if (dateFilter && !expense.expenseDate.startsWith(dateFilter)) return false
    return true
  })

  const getTotalExpenses = () => {
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const getCategoryTotals = () => {
    const totals: { [key: string]: number } = {}
    filteredExpenses.forEach((expense) => {
      const category = expense.category || "Uncategorized"
      totals[category] = (totals[category] || 0) + expense.amount
    })
    return Object.entries(totals).sort(([, a], [, b]) => b - a)
  }

  const exportExpenses = () => {
    const csvContent = [
      ["Date", "User", "Category", "Description", "Amount"],
      ...filteredExpenses.map((expense) => [
        format(new Date(expense.expenseDate), "yyyy-MM-dd"),
        expense.user.name,
        expense.category || "Uncategorized",
        expense.description,
        expense.amount.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading expenses...</div>
  }

  const categoryTotals = getCategoryTotals()

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
                <h1 className="text-3xl font-bold">Company Expenses</h1>
                <p className="text-muted-foreground">Monitor and manage company expense reports</p>
              </div>
              <Button onClick={exportExpenses} className="gap-2">
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
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-3xl font-bold">ugx{getTotalExpenses().toFixed(2)}</p>
                    </div>
                    <Receipt className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Top Category</p>
                    {categoryTotals.length > 0 ? (
                      <div>
                        <p className="text-lg font-semibold">{categoryTotals[0][0]}</p>
                        <p className="text-sm text-muted-foreground">ugx{categoryTotals[0][1].toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">No expenses</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">This Month</p>
                    <p className="text-lg font-semibold">
                      ugx
                      {filteredExpenses
                        .filter((e) => new Date(e.expenseDate).getMonth() === new Date().getMonth())
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All categories">All categories</SelectItem>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                        setCategoryFilter("All categories")
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

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Reports ({filteredExpenses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No expenses found matching your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{format(new Date(expense.expenseDate), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{expense.user.name}</p>
                                <p className="text-sm text-muted-foreground">{expense.user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {expense.category ? (
                                <Badge variant="secondary">{expense.category}</Badge>
                              ) : (
                                <span className="text-muted-foreground">Uncategorized</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell className="font-semibold">ugx{expense.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {expense.receiptUrl ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
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
                                  setSelectedExpense(expense)
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

            {/* Expense Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Expense Details</DialogTitle>
                </DialogHeader>
                {selectedExpense && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Submitted By</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedExpense.user.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedExpense.user.email}</p>
                        </div>
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <p className="text-2xl font-bold">ugx{selectedExpense.amount.toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <p className="text-sm bg-muted p-3 rounded">{selectedExpense.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <p>{selectedExpense.category || "Uncategorized"}</p>
                      </div>
                      <div>
                        <Label>Expense Date</Label>
                        <p>{format(new Date(selectedExpense.expenseDate), "PPP")}</p>
                      </div>
                    </div>

                    {selectedExpense.receiptUrl && (
                      <div>
                        <Label>Receipt</Label>
                        <div className="mt-2">
                          <img
                            src={selectedExpense.receiptUrl || "/placeholder.svg"}
                            alt="Receipt"
                            className="max-w-full h-auto rounded-lg border"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Submitted On</Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedExpense.createdAt), "PPpp")}
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
