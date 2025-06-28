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
import { toast } from "sonner"
import { CreditCard, Plus, Upload, Camera, X, Eye } from "lucide-react"

interface Payment {
  id: string
  amount: number
  description: string
  receiptUrl?: string
  paymentDate: string
  createdAt: string
}

export default function PaymentsPage() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])

  const mockUser = {
    name: "John Smith",
    email: "user@demo.com",
    role: "USER",
    companyName: "TechCorp Solutions",
  }

  useEffect(() => {
    fetchPayments()
    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/user/payments")
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
      } else {
        toast.error("Failed to fetch payments")
      }
    } catch (error) {
      toast.error("Error fetching payments")
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

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description || !paymentDate) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      let receiptUrl = null
      if (selectedFile) {
        receiptUrl = await uploadFile(selectedFile)
      }

      const response = await fetch("/api/user/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          description,
          receiptUrl,
          paymentDate,
        }),
      })

      if (response.ok) {
        toast.success("Payment recorded successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchPayments()
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

  const resetForm = () => {
    setAmount("")
    setDescription("")
    setPaymentDate(new Date().toISOString().split("T")[0])
    removeFile()
    stopCamera()
  }

  // Fixed getTotalPayments function with proper error handling
  const getTotalPayments = (): number => {
    if (!payments || payments.length === 0) {
      return 0
    }

    return payments.reduce((total, payment) => {
      const amount = Number(payment.amount)
      return total + (isNaN(amount) ? 0 : amount)
    }, 0)
  }

  // Helper function to safely format currency
  const formatCurrency = (amount: number): string => {
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
      return "UGX 0.00"
    }
    return `UGX ${amount.toFixed(2)}`
  }

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
              <div className="flex items-center justify-center h-64">Please sign in to view payments</div>
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
                <h1 className="text-2xl font-bold text-foreground">My Payments</h1>
                <p className="text-muted-foreground">Track and manage your payment records</p>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record New Payment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePayment} className="space-y-4">
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
                        placeholder="What was this payment for?"
                        required
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
                      {isSubmitting ? "Recording..." : "Record Payment"}
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
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                    <p className="text-3xl font-bold">{formatCurrency(getTotalPayments())}</p>
                  </div>
                  <CreditCard className="w-12 h-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded. Add your first payment to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Recorded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.description}</TableCell>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
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
                            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
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
