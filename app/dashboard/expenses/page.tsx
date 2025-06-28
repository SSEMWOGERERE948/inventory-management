"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Receipt, Plus, Upload, Camera, X, Eye } from "lucide-react"

interface Expense {
  id: string
  amount: number
  description: string
  category: string
  receiptUrl?: string
  expenseDate: string
  createdAt: string
}

const expenseCategories = [
  "Office Supplies",
  "Travel",
  "Meals & Entertainment",
  "Software & Subscriptions",
  "Equipment",
  "Marketing",
  "Training",
  "Utilities",
  "Other",
]

export default function ExpensesPage() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Form state
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])

  const mockUser = {
    name: "John Smith",
    email: "user@demo.com",
    role: "USER",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchExpenses()
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/user/expenses")
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      } else {
        toast.error("Failed to fetch expenses")
      }
    } catch (error) {
      toast.error("Error fetching expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File size must be less than 5MB")
        return
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
      }
    } catch (error) {
      toast.error("Unable to access camera")
      console.error("Camera error:", error)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" })
              setSelectedFile(file)
              setPreviewUrl(URL.createObjectURL(file))
              stopCamera()
            }
          },
          "image/jpeg",
          0.8,
        )
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "receipt")

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload file")
    }

    const data = await response.json()
    return data.url
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description || !category || !expenseDate) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      let receiptUrl = null
      if (selectedFile) {
        receiptUrl = await uploadFile(selectedFile)
      }

      const response = await fetch("/api/user/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          description,
          category,
          receiptUrl,
          expenseDate,
        }),
      })

      if (response.ok) {
        toast.success("Expense recorded successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchExpenses()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to record expense")
      }
    } catch (error) {
      toast.error("Error recording expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setAmount("")
    setDescription("")
    setCategory("")
    setExpenseDate(new Date().toISOString().split("T")[0])
    removeFile()
    stopCamera()
  }

  // Enhanced getTotalExpenses with proper error handling
  const getTotalExpenses = (): number => {
    try {
      if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
        return 0
      }

      const total = expenses.reduce((sum, expense) => {
        // Ensure expense.amount is a valid number
        const amount = Number(expense?.amount)
        if (isNaN(amount) || !isFinite(amount)) {
          return sum
        }
        return sum + amount
      }, 0)

      // Return 0 if total is not a valid number
      return isNaN(total) || !isFinite(total) ? 0 : total
    } catch (error) {
      console.error("Error calculating total expenses:", error)
      return 0
    }
  }

  // Enhanced formatCurrency helper function
  const formatCurrency = (amount: number | undefined | null): string => {
    try {
      // Convert to number and validate
      const numAmount = Number(amount)
      if (amount === undefined || amount === null || isNaN(numAmount) || !isFinite(numAmount)) {
        return "UGX 0.00"
      }
      return `UGX ${numAmount.toFixed(2)}`
    } catch (error) {
      console.error("Error formatting currency:", error)
      return "UGX 0.00"
    }
  }

  // Enhanced getTopCategory with error handling
  const getTopCategory = () => {
    try {
      if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
        return null
      }

      const categoryTotals: { [key: string]: number } = {}

      expenses.forEach((expense) => {
        if (!expense || typeof expense !== "object") return

        const cat = expense.category || "Uncategorized"
        const amount = Number(expense.amount)

        if (!isNaN(amount) && isFinite(amount)) {
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amount
        }
      })

      const entries = Object.entries(categoryTotals)
      if (entries.length === 0) return null

      const topCategory = entries.sort(([, a], [, b]) => b - a)[0]
      return topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
    } catch (error) {
      console.error("Error calculating top category:", error)
      return null
    }
  }

  const topCategory = getTopCategory()

  if (!session) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole="USER" companyName="TechCorp Solutions" />
        <MobileSidebar
          userRole="USER"
          companyName="TechCorp Solutions"
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={mockUser} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-center h-64">Please sign in to view expenses</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="USER" companyName="TechCorp Solutions" />
      <MobileSidebar
        userRole="USER"
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
                <h1 className="text-2xl font-bold text-foreground">My Expenses</h1>
                <p className="text-muted-foreground">Track and manage your business expenses</p>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateExpense} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What was this expense for?"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Expense Date *</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* Receipt Upload Section */}
                    <div className="space-y-2">
                      <Label>Receipt (Optional)</Label>
                      {!showCamera && !previewUrl && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={startCamera}
                            className="flex-1 bg-transparent"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Take Photo
                          </Button>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {/* Camera View */}
                      {showCamera && (
                        <div className="space-y-2">
                          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                          <div className="flex gap-2">
                            <Button type="button" onClick={capturePhoto} className="flex-1">
                              <Camera className="h-4 w-4 mr-2" />
                              Capture
                            </Button>
                            <Button type="button" variant="outline" onClick={stopCamera}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Preview */}
                      {previewUrl && (
                        <div className="space-y-2">
                          <div className="relative">
                            <img
                              src={previewUrl || "/placeholder.svg"}
                              alt="Receipt preview"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeFile}
                              className="absolute top-2 right-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        </div>
                      )}

                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add Expense"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-3xl font-bold">{formatCurrency(getTotalExpenses())}</p>
                  </div>
                  <Receipt className="w-12 h-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Top Category Card */}
            {topCategory && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Top Category</p>
                      <p className="text-xl font-semibold">{topCategory.name}</p>
                      <p className="text-lg text-muted-foreground">{formatCurrency(topCategory.amount)}</p>
                    </div>
                    <Receipt className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expense History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded. Add your first expense to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Recorded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
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
                            <TableCell>{new Date(expense.createdAt).toLocaleDateString()}</TableCell>
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
