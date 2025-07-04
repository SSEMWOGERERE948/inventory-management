"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RefreshCw, Package, Users, ShoppingCart } from "lucide-react"

interface InventoryStats {
  totalUsers: number
  totalShippedOrders: number
  totalUniqueProducts: number
  userResults: Array<{
    userId: string
    userName: string
    productsPopulated: number
  }>
}

export function InventoryManager() {
  const [isPopulating, setIsPopulating] = useState(false)
  const [lastPopulationResult, setLastPopulationResult] = useState<InventoryStats | null>(null)

  const handlePopulateInventory = async () => {
    setIsPopulating(true)
    try {
      const response = await fetch("/api/user/inventory/populate", {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        setLastPopulationResult(result.results)
        toast.success("Inventory populated successfully for all company users!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to populate inventory")
      }
    } catch (error) {
      console.error("Error populating inventory:", error)
      toast.error("Error populating inventory")
    } finally {
      setIsPopulating(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Management
        </CardTitle>
        <CardDescription>Populate user inventories with all shipped products from your company</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handlePopulateInventory} disabled={isPopulating} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isPopulating ? "animate-spin" : ""}`} />
            {isPopulating ? "Populating..." : "Populate All User Inventories"}
          </Button>
        </div>

        {lastPopulationResult && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800">Last Population Results</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{lastPopulationResult.totalUsers}</p>
                  <p className="text-xs text-gray-600">Users Updated</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{lastPopulationResult.totalShippedOrders}</p>
                  <p className="text-xs text-gray-600">Shipped Orders</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">{lastPopulationResult.totalUniqueProducts}</p>
                  <p className="text-xs text-gray-600">Unique Products</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">User Results:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lastPopulationResult.userResults.map((result) => (
                  <div key={result.userId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{result.userName}</span>
                    <Badge variant="secondary">{result.productsPopulated} products</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>What this does:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Finds all shipped orders in your company</li>
            <li>Creates inventory records for all users based on what they've received</li>
            <li>Ensures users can see all company products in their inventory</li>
            <li>Updates quantities based on actual shipments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
