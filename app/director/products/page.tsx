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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  BarChart3,
  ShoppingCart,
  DollarSign,
  History,
  Settings,
  Minus,
  RefreshCw,
} from "lucide-react"

interface Product {
  id: string
  name: string
  description?: string
  sku: string
  price: number
  quantity: number
  stockQuantity: number // New field for stock tracking
  minStock: number
  minStockLevel: number // New field
  maxStockLevel: number // New field
  lastStockUpdate: string // New field
  status: string
  createdAt: string
  totalSales: number
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
  hasActiveAlerts: boolean
  category?: {
    id: string
    name: string
  }
  stockAlerts: Array<{
    id: string
    alertType: string
    message: string
    currentStock: number
    createdAt: string
  }>
  stockMovements?: Array<{
    id: string
    movementType: string
    quantity: number
    previousStock: number
    newStock: number
    referenceType: string
    notes: string
    createdAt: string
    user?: {
      name: string
    }
  }>
}

interface Category {
  id: string
  name: string
}

interface Analytics {
  regularOrders: Array<{
    productId: string
    productName: string
    productSku: string
    currentStock: number
    totalQuantitySold: number
    totalRevenue: number
    totalOrders: number
    averageOrderSize: number
  }>
  creditSales: Array<{
    productId: string
    productName: string
    productSku: string
    totalQuantitySold: number
    totalRevenue: number
    totalOrders: number
  }>
  summary: {
    totalProducts: number
    totalRevenue: number
    totalQuantitySold: number
  }
}

interface StockUpdateData {
  productId: string
  quantity: number
  movementType: "IN" | "OUT" | "ADJUSTMENT"
  notes: string
}

export default function DirectorProductsPage() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false)
  const [isStockHistoryDialogOpen, setIsStockHistoryDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sku, setSku] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [minThreshold, setMinThreshold] = useState("")
  const [maxThreshold, setMaxThreshold] = useState("")
  const [categoryId, setCategoryId] = useState("")

  // Restock form states
  const [restockQuantity, setRestockQuantity] = useState("")
  const [restockNotes, setRestockNotes] = useState("")

  // Stock update states
  const [stockUpdateData, setStockUpdateData] = useState<StockUpdateData>({
    productId: "",
    quantity: 0,
    movementType: "IN",
    notes: "",
  })

  useEffect(() => {
    if (session) {
      fetchProducts()
      fetchCategories()
      fetchAnalytics()
    }
  }, [session])

  const fetchProducts = async () => {
    try {
      // Try to fetch from the stock endpoint first, fallback to director products
      let response = await fetch("/api/director/stock")
      if (!response.ok) {
        response = await fetch("/api/director/products")
      }

      if (response.ok) {
        const data = await response.json()
        setProducts(
          data.map((product: any) => ({
            ...product,
            stockQuantity: product.stockQuantity || product.quantity || 0,
            minStockLevel: product.minStockLevel || product.minStock || 10,
            stockStatus: getStockStatusFromQuantity(
              product.stockQuantity || product.quantity || 0,
              product.minStockLevel || product.minStock || 10,
            ),
            hasActiveAlerts: product.stockAlerts?.length > 0 || false,
          })),
        )
      } else {
        toast.error("Failed to fetch products")
      }
    } catch (error) {
      toast.error("Error fetching products")
    } finally {
      setLoading(false)
    }
  }

  const getStockStatusFromQuantity = (
    quantity: number,
    minLevel: number,
  ): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" => {
    if (quantity === 0) return "OUT_OF_STOCK"
    if (quantity <= minLevel) return "LOW_STOCK"
    return "IN_STOCK"
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/director/products/analytics")
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/director/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: stockUpdateData.quantity,
          movementType: stockUpdateData.movementType,
          notes: stockUpdateData.notes,
        }),
      })

      if (response.ok) {
        toast.success("Stock updated successfully")
        setIsStockUpdateDialogOpen(false)
        setStockUpdateData({ productId: "", quantity: 0, movementType: "IN", notes: "" })
        fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update stock")
      }
    } catch (error) {
      toast.error("Error updating stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !restockQuantity) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/director/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: Number.parseInt(restockQuantity),
          movementType: "IN",
          notes: restockNotes || `Restock: Added ${restockQuantity} units`,
        }),
      })

      if (response.ok) {
        toast.success("Product restocked successfully")
        setIsRestockDialogOpen(false)
        setRestockQuantity("")
        setRestockNotes("")
        fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to restock product")
      }
    } catch (error) {
      toast.error("Error restocking product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openStockUpdateDialog = (product: Product, movementType: "IN" | "OUT" | "ADJUSTMENT") => {
    setSelectedProduct(product)
    setStockUpdateData({
      productId: product.id,
      quantity: 0,
      movementType,
      notes: "",
    })
    setIsStockUpdateDialogOpen(true)
  }

  const openStockHistoryDialog = async (product: Product) => {
    setSelectedProduct(product)
    // Fetch detailed stock movements for this product
    try {
      const response = await fetch(`/api/director/stock/${product.id}/movements`)
      if (response.ok) {
        const movements = await response.json()
        setSelectedProduct({ ...product, stockMovements: movements })
      }
    } catch (error) {
      console.error("Error fetching stock movements:", error)
    }
    setIsStockHistoryDialogOpen(true)
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setSku("")
    setPrice("")
    setQuantity("")
    setMinThreshold("")
    setMaxThreshold("")
    setCategoryId("")
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/director/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          sku,
          price: Number.parseFloat(price),
          quantity: Number.parseInt(quantity),
          minStock: Number.parseInt(minThreshold),
          maxStock: Number.parseInt(maxThreshold) || 1000,
          categoryId: categoryId || null,
        }),
      })

      if (response.ok) {
        toast.success("Product created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchProducts()
        fetchAnalytics()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create product")
      }
    } catch (error) {
      toast.error("Error creating product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStockStatusBadge = (product: Product) => {
    const currentStock = product.stockQuantity || product.quantity || 0
    const minLevel = product.minStockLevel || product.minStock || 10

    if (currentStock === 0) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Out of Stock
        </Badge>
      )
    } else if (currentStock <= minLevel) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low Stock
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Package className="h-3 w-3 mr-1" />
          In Stock
        </Badge>
      )
    }
  }

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`

  const getTopSellingProducts = () => {
    if (!analytics) return []

    const combined = [
      ...analytics.regularOrders.map((p) => ({ ...p, source: "Regular Orders" })),
      ...analytics.creditSales.map((p) => ({ ...p, source: "Credit Sales", currentStock: 0, averageOrderSize: 0 })),
    ]

    return combined.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold).slice(0, 5)
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Please sign in</div>
      </div>
    )
  }

  const user = {
    name: session.user.name || "Director",
    email: session.user.email || "",
    role: session.user.role || "COMPANY_DIRECTOR",
    companyName: session.user.companyId || "Your Company",
  }

  const lowStockProducts = products.filter((p) => {
    const currentStock = p.stockQuantity || p.quantity || 0
    const minLevel = p.minStockLevel || p.minStock || 10
    return currentStock <= minLevel
  })

  const outOfStockProducts = products.filter((p) => (p.stockQuantity || p.quantity || 0) === 0)
  const activeAlerts = products.filter((p) => p.hasActiveAlerts)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRole={session.user.role || "COMPANY_DIRECTOR"}
        companyName={session.user.companyId || "Your Company"}
      />

      <MobileSidebar
        userRole={session.user.role || "COMPANY_DIRECTOR"}
        companyName={session.user.companyId || "Your Company"}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Products & Stock Management</h1>
                <p className="text-muted-foreground">Manage your company's product inventory and stock levels</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchProducts} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-card-foreground">Add New Product</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateProduct} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-card-foreground">
                          Product Name *
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter product name"
                          required
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-card-foreground">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Product description"
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku" className="text-card-foreground">
                          SKU *
                        </Label>
                        <Input
                          id="sku"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="Product SKU"
                          required
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price" className="text-card-foreground">
                            Price *
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0.00"
                            required
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity" className="text-card-foreground">
                            Initial Stock *
                          </Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            required
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minThreshold" className="text-card-foreground">
                            Min Stock Level *
                          </Label>
                          <Input
                            id="minThreshold"
                            type="number"
                            min="0"
                            value={minThreshold}
                            onChange={(e) => setMinThreshold(e.target.value)}
                            placeholder="10"
                            required
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxThreshold" className="text-card-foreground">
                            Max Stock Level
                          </Label>
                          <Input
                            id="maxThreshold"
                            type="number"
                            min="0"
                            value={maxThreshold}
                            onChange={(e) => setMaxThreshold(e.target.value)}
                            placeholder="1000"
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-card-foreground">
                          Category
                        </Label>
                        <select
                          id="category"
                          className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Product"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Enhanced Analytics Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-3xl font-bold text-card-foreground">{products.length}</p>
                    </div>
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {analytics && (
                <>
                  <Card className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-3xl font-bold text-card-foreground">
                            {formatCurrency(analytics.summary.totalRevenue)}
                          </p>
                        </div>
                        <DollarSign className="w-12 h-12 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Units Sold</p>
                          <p className="text-3xl font-bold text-card-foreground">
                            {analytics.summary.totalQuantitySold}
                          </p>
                        </div>
                        <ShoppingCart className="w-12 h-12 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card
                className={`bg-card border-border ${lowStockProducts.length > 0 ? "border-yellow-200 dark:border-yellow-800" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                      <p className="text-3xl font-bold text-yellow-600">{lowStockProducts.length}</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`bg-card border-border ${outOfStockProducts.length > 0 ? "border-red-200 dark:border-red-800" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Out of Stock</p>
                      <p className="text-3xl font-bold text-red-600">{outOfStockProducts.length}</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock Alerts Section */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
              <Alert variant="destructive" className="border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Stock Alert:</strong> {outOfStockProducts.length} products are out of stock and{" "}
                  {lowStockProducts.length - outOfStockProducts.length} products have low stock levels.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="products" className="space-y-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="products" className="data-[state=active]:bg-background">
                  All Products
                </TabsTrigger>
                <TabsTrigger value="stock-management" className="data-[state=active]:bg-background">
                  Stock Management
                </TabsTrigger>
                <TabsTrigger value="alerts" className="data-[state=active]:bg-background">
                  Stock Alerts ({activeAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-background">
                  Sales Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-card-foreground">
                      <Package className="h-5 w-5" />
                      All Products ({products.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading products...</div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No products found.</p>
                        <p className="text-sm">Add your first product to get started.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-muted/50">
                              <TableHead className="text-muted-foreground">Product</TableHead>
                              <TableHead className="text-muted-foreground">SKU</TableHead>
                              <TableHead className="text-muted-foreground">Current Stock</TableHead>
                              <TableHead className="text-muted-foreground">Min Level</TableHead>
                              <TableHead className="text-muted-foreground">Price</TableHead>
                              <TableHead className="text-muted-foreground">Sales</TableHead>
                              <TableHead className="text-muted-foreground">Status</TableHead>
                              <TableHead className="text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => {
                              const currentStock = product.stockQuantity || product.quantity || 0
                              const minLevel = product.minStockLevel || product.minStock || 10
                              return (
                                <TableRow
                                  key={product.id}
                                  className={`border-border hover:bg-muted/50 ${currentStock === 0 ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                                >
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-card-foreground">{product.name}</p>
                                      {product.description && (
                                        <p className="text-sm text-muted-foreground">{product.description}</p>
                                      )}
                                      {product.category && (
                                        <Badge variant="outline" className="mt-1 border-border">
                                          {product.category.name}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-card-foreground">{product.sku}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={
                                          currentStock <= minLevel
                                            ? "font-bold text-red-600"
                                            : "font-semibold text-card-foreground"
                                        }
                                      >
                                        {currentStock}
                                      </span>
                                      {product.hasActiveAlerts && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-card-foreground">{minLevel}</TableCell>
                                  <TableCell className="text-card-foreground">
                                    {formatCurrency(product.price)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="h-4 w-4 text-green-500" />
                                      <span className="text-card-foreground">{product.totalSales || 0}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStockStatusBadge(product)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openStockUpdateDialog(product, "IN")}
                                        className="h-8 w-8 p-0 border-border hover:bg-muted"
                                        title="Add Stock"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openStockUpdateDialog(product, "OUT")}
                                        className="h-8 w-8 p-0 border-border hover:bg-muted"
                                        disabled={currentStock === 0}
                                        title="Remove Stock"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openStockHistoryDialog(product)}
                                        className="h-8 w-8 p-0 border-border hover:bg-muted"
                                        title="Stock History"
                                      >
                                        <History className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openStockUpdateDialog(product, "ADJUSTMENT")}
                                        className="h-8 w-8 p-0 border-border hover:bg-muted"
                                        title="Adjust Stock"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </div>
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
              </TabsContent>

              <TabsContent value="stock-management">
                <div className="space-y-6">
                  {/* Quick Stock Actions */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-card-foreground">Quick Stock Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4 bg-muted border-border">
                          <div className="text-center">
                            <Plus className="h-8 w-8 mx-auto mb-2 text-green-600" />
                            <h3 className="font-semibold text-card-foreground">Add Stock</h3>
                            <p className="text-sm text-muted-foreground mb-3">Increase inventory levels</p>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (products.length > 0) {
                                  openStockUpdateDialog(products[0], "IN")
                                }
                              }}
                            >
                              Add Stock
                            </Button>
                          </div>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <div className="text-center">
                            <Minus className="h-8 w-8 mx-auto mb-2 text-red-600" />
                            <h3 className="font-semibold text-card-foreground">Remove Stock</h3>
                            <p className="text-sm text-muted-foreground mb-3">Deduct damaged/lost items</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (products.length > 0) {
                                  openStockUpdateDialog(products[0], "OUT")
                                }
                              }}
                            >
                              Remove Stock
                            </Button>
                          </div>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <div className="text-center">
                            <Settings className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                            <h3 className="font-semibold text-card-foreground">Adjust Stock</h3>
                            <p className="text-sm text-muted-foreground mb-3">Set exact stock levels</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (products.length > 0) {
                                  openStockUpdateDialog(products[0], "ADJUSTMENT")
                                }
                              }}
                            >
                              Adjust Stock
                            </Button>
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Low Stock Products */}
                  {lowStockProducts.length > 0 && (
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-5 w-5" />
                          Products Requiring Attention ({lowStockProducts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {lowStockProducts.map((product) => {
                            const currentStock = product.stockQuantity || product.quantity || 0
                            const minLevel = product.minStockLevel || product.minStock || 10
                            const isOutOfStock = currentStock === 0

                            return (
                              <div
                                key={product.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${
                                  isOutOfStock
                                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                                    : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
                                }`}
                              >
                                <div>
                                  <h3
                                    className={`font-semibold ${
                                      isOutOfStock
                                        ? "text-red-800 dark:text-red-200"
                                        : "text-yellow-800 dark:text-yellow-200"
                                    }`}
                                  >
                                    {product.name}
                                  </h3>
                                  <p
                                    className={`text-sm ${
                                      isOutOfStock
                                        ? "text-red-600 dark:text-red-300"
                                        : "text-yellow-600 dark:text-yellow-300"
                                    }`}
                                  >
                                    {isOutOfStock
                                      ? "Out of stock - Cannot fulfill orders"
                                      : `Low stock: ${currentStock} left (min: ${minLevel})`}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => openStockUpdateDialog(product, "IN")}
                                  className={isOutOfStock ? "bg-red-600 hover:bg-red-700" : ""}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Stock
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="alerts">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-card-foreground">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Stock Alerts ({activeAlerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeAlerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No active stock alerts.</p>
                        <p className="text-sm">All products are adequately stocked.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeAlerts.map((product) => (
                          <div
                            key={product.id}
                            className="border border-red-200 rounded-lg p-4 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-200">{product.name}</h3>
                                <p className="text-sm text-red-600 dark:text-red-300">
                                  Current Stock: {product.stockQuantity || product.quantity || 0} | Minimum:{" "}
                                  {product.minStockLevel || product.minStock || 10}
                                </p>
                                {product.stockAlerts.map((alert) => (
                                  <p key={alert.id} className="text-sm text-red-600 dark:text-red-300 mt-1">
                                    {alert.message || `${alert.alertType}: Current stock is ${alert.currentStock}`}
                                  </p>
                                ))}
                              </div>
                              <Button size="sm" onClick={() => openStockUpdateDialog(product, "IN")}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restock
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-6">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-card-foreground">
                        <BarChart3 className="h-5 w-5" />
                        Top Selling Products
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics && getTopSellingProducts().length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border hover:bg-muted/50">
                                <TableHead className="text-muted-foreground">Product</TableHead>
                                <TableHead className="text-muted-foreground">Source</TableHead>
                                <TableHead className="text-muted-foreground">Units Sold</TableHead>
                                <TableHead className="text-muted-foreground">Revenue</TableHead>
                                <TableHead className="text-muted-foreground">Orders</TableHead>
                                <TableHead className="text-muted-foreground">Current Stock</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getTopSellingProducts().map((item, index) => (
                                <TableRow
                                  key={`${item.productId}-${item.source}`}
                                  className="border-border hover:bg-muted/50"
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="border-border">
                                        #{index + 1}
                                      </Badge>
                                      <div>
                                        <p className="font-medium text-card-foreground">{item.productName}</p>
                                        <p className="text-sm text-muted-foreground">{item.productSku}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={item.source === "Regular Orders" ? "default" : "secondary"}>
                                      {item.source}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-semibold text-card-foreground">
                                    {item.totalQuantitySold}
                                  </TableCell>
                                  <TableCell className="font-semibold text-green-600">
                                    {formatCurrency(item.totalRevenue)}
                                  </TableCell>
                                  <TableCell className="text-card-foreground">{item.totalOrders}</TableCell>
                                  <TableCell>
                                    <span
                                      className={`${item.currentStock <= 10 ? "text-red-600 font-semibold" : "text-card-foreground"}`}
                                    >
                                      {item.currentStock || "N/A"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No sales data available yet.</p>
                          <p className="text-sm">Sales analytics will appear once orders are processed.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={isStockUpdateDialogOpen} onOpenChange={setIsStockUpdateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              Update Stock - {selectedProduct?.name}
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Current stock: {selectedProduct?.stockQuantity || selectedProduct?.quantity || 0} units
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movementType" className="text-card-foreground">
                Movement Type
              </Label>
              <Select
                value={stockUpdateData.movementType}
                onValueChange={(value: "IN" | "OUT" | "ADJUSTMENT") =>
                  setStockUpdateData((prev) => ({ ...prev, movementType: value }))
                }
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="IN">Add Stock (IN)</SelectItem>
                  <SelectItem value="OUT">Remove Stock (OUT)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Set Exact Amount (ADJUSTMENT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-card-foreground">
                {stockUpdateData.movementType === "ADJUSTMENT" ? "New Stock Level" : "Quantity"}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={stockUpdateData.quantity}
                onChange={(e) =>
                  setStockUpdateData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 0 }))
                }
                required
                className="bg-background border-border text-foreground"
              />
              {stockUpdateData.movementType !== "ADJUSTMENT" && selectedProduct && (
                <p className="text-sm text-muted-foreground">
                  New stock will be:{" "}
                  {stockUpdateData.movementType === "IN"
                    ? (selectedProduct.stockQuantity || selectedProduct.quantity || 0) + stockUpdateData.quantity
                    : Math.max(
                        0,
                        (selectedProduct.stockQuantity || selectedProduct.quantity || 0) - stockUpdateData.quantity,
                      )}{" "}
                  units
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-card-foreground">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={stockUpdateData.notes}
                onChange={(e) => setStockUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this stock movement..."
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsStockUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={isStockHistoryDialogOpen} onOpenChange={setIsStockHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Stock Movement History - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {selectedProduct?.stockQuantity || selectedProduct?.quantity || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minimum Level</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {selectedProduct?.minStockLevel || selectedProduct?.minStock || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm text-card-foreground">
                  {selectedProduct?.lastStockUpdate
                    ? new Date(selectedProduct.lastStockUpdate).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {selectedProduct?.stockMovements && selectedProduct.stockMovements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Quantity</TableHead>
                    <TableHead className="text-muted-foreground">Previous</TableHead>
                    <TableHead className="text-muted-foreground">New Stock</TableHead>
                    <TableHead className="text-muted-foreground">Reference</TableHead>
                    <TableHead className="text-muted-foreground">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProduct.stockMovements.map((movement) => (
                    <TableRow key={movement.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-sm text-card-foreground">
                        {new Date(movement.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movement.movementType === "IN"
                              ? "default"
                              : movement.movementType === "OUT"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-card-foreground">
                        {movement.movementType === "OUT" ? "-" : "+"}
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="text-card-foreground">{movement.previousStock}</TableCell>
                      <TableCell className="font-semibold text-card-foreground">{movement.newStock}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border">
                          {movement.referenceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate text-card-foreground" title={movement.notes}>
                        {movement.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No stock movements recorded yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legacy Restock Dialog (keeping for compatibility) */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Restock {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-card-foreground">
                Current Stock:{" "}
                <span className="font-semibold">
                  {selectedProduct?.stockQuantity || selectedProduct?.quantity || 0}
                </span>
              </p>
              <p className="text-sm text-card-foreground">
                Minimum Level:{" "}
                <span className="font-semibold">
                  {selectedProduct?.minStockLevel || selectedProduct?.minStock || 0}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restockQuantity" className="text-card-foreground">
                Quantity to Add *
              </Label>
              <Input
                id="restockQuantity"
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restockNotes" className="text-card-foreground">
                Notes
              </Label>
              <Textarea
                id="restockNotes"
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
                placeholder="Restock notes..."
                className="bg-background border-border text-foreground"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Restocking..." : "Restock Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
