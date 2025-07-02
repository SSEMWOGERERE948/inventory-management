"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard, Users, TrendingUp, AlertCircle, Plus, History } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface User {
  id: string
  name: string
  email: string
  creditLimit: number
  creditUsed: number
  createdAt: string
}

interface CreditTransaction {
  id: string
  type: string
  amount: number
  description: string
  createdAt: string
  user: {
    name: string
    email: string
  }
}

interface CreditData {
  users: User[]
  transactions: CreditTransaction[]
}

export default function DirectorCreditPage() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [creditData, setCreditData] = useState<CreditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSetCreditDialogOpen, setIsSetCreditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditLimit, setCreditLimit] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session?.user?.role === "COMPANY_DIRECTOR") {
      fetchCreditData()
    }
  }, [session])

  const fetchCreditData = async () => {
    try {
      const response = await fetch("/api/director/credit")
      if (response.ok) {
        const data = await response.json()
        setCreditData(data)
      } else {
        toast.error("Failed to fetch credit data")
      }
    } catch (error) {
      console.error("Error fetching credit data:", error)
      toast.error("Error fetching credit data")
    } finally {
      setLoading(false)
    }
  }

  const handleSetCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !creditLimit) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/director/credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          creditLimit: Number.parseFloat(creditLimit),
          description,
        }),
      })

      if (response.ok) {
        toast.success("Credit limit updated successfully")
        setIsSetCreditDialogOpen(false)
        resetForm()
        fetchCreditData()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update credit limit")
      }
    } catch (error) {
      toast.error("Error updating credit limit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedUser(null)
    setCreditLimit("")
    setDescription("")
  }

  const formatCurrency = (amount: number): string => {
    return `UGX ${amount.toLocaleString()}`
  }

  const getTotalCreditGranted = (): number => {
    if (!creditData) return 0
    return creditData.users.reduce((total, user) => total + user.creditLimit, 0)
  }

  const getTotalCreditUsed = (): number => {
    if (!creditData) return 0
    return creditData.users.reduce((total, user) => total + user.creditUsed, 0)
  }

  const getUsersWithCredit = (): User[] => {
    if (!creditData) return []
    return creditData.users.filter((user) => user.creditLimit > 0)
  }

  if (!session) {
    return <div className="flex items-center justify-center h-64">Please sign in</div>
  }

  if (session.user.role !== "COMPANY_DIRECTOR") {
    return <div className="text-center py-8">Access denied. Director role required.</div>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading credit data...</div>
  }

  const user = {
    name: session.user.name || "Director",
    email: session.user.email || "",
    role: session.user.role || "COMPANY_DIRECTOR",
    companyName: session.user.companyName || "Your Company",
  }

  const usersWithCredit = getUsersWithCredit()

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
                <h1 className="text-3xl font-bold">Credit Management</h1>
                <p className="text-muted-foreground">Manage user credit limits and track credit usage</p>
              </div>

              <Dialog open={isSetCreditDialogOpen} onOpenChange={setIsSetCreditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Set Credit Limit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set Credit Limit</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSetCredit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user">Select User *</Label>
                      <select
                        id="user"
                        value={selectedUser?.id || ""}
                        onChange={(e) => {
                          const user = creditData?.users.find((u) => u.id === e.target.value)
                          setSelectedUser(user || null)
                          if (user) {
                            setCreditLimit(user.creditLimit.toString())
                          }
                        }}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="">Choose a user...</option>
                        {creditData?.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="creditLimit">Credit Limit (UGX) *</Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                      {selectedUser && (
                        <p className="text-sm text-muted-foreground">
                          Current: {formatCurrency(selectedUser.creditLimit)} | Used:{" "}
                          {formatCurrency(selectedUser.creditUsed)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Reason for credit limit change..."
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Updating..." : "Update Credit Limit"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credit Granted</p>
                      <p className="text-3xl font-bold">{formatCurrency(getTotalCreditGranted())}</p>
                    </div>
                    <CreditCard className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credit Used</p>
                      <p className="text-3xl font-bold text-orange-600">{formatCurrency(getTotalCreditUsed())}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Credit</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(getTotalCreditGranted() - getTotalCreditUsed())}
                      </p>
                    </div>
                    <AlertCircle className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Users with Credit</p>
                      <p className="text-3xl font-bold">{usersWithCredit.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users with Credit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Credit Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditData?.users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Credit Limit</TableHead>
                          <TableHead>Credit Used</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditData?.users.map((user) => {
                          const available = user.creditLimit - user.creditUsed
                          const utilizationPercent =
                            user.creditLimit > 0 ? (user.creditUsed / user.creditLimit) * 100 : 0

                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">{formatCurrency(user.creditLimit)}</TableCell>
                              <TableCell className="text-orange-600">{formatCurrency(user.creditUsed)}</TableCell>
                              <TableCell className="text-green-600">{formatCurrency(available)}</TableCell>
                              <TableCell>
                                {user.creditLimit === 0 ? (
                                  <Badge variant="outline">No Credit</Badge>
                                ) : utilizationPercent >= 90 ? (
                                  <Badge variant="destructive">High Usage</Badge>
                                ) : utilizationPercent >= 50 ? (
                                  <Badge variant="secondary">Medium Usage</Badge>
                                ) : (
                                  <Badge variant="default">Low Usage</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setCreditLimit(user.creditLimit.toString())
                                    setIsSetCreditDialogOpen(true)
                                  }}
                                >
                                  Edit Credit
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Credit Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Credit Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditData?.transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No credit transactions found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditData?.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{format(new Date(transaction.createdAt), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{transaction.user.name}</p>
                                <p className="text-sm text-muted-foreground">{transaction.user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.type === "GRANTED"
                                    ? "default"
                                    : transaction.type === "USED"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                            <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
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
