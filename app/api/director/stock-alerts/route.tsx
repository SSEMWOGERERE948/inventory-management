import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
type AlertType = "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all products for the company
    const products = await prisma.product.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minStock: true,
        maxStock: true,
        price: true,
        updatedAt: true,
      },
    })

    // Generate stock alerts based on current inventory levels
    const alerts = []

    for (const product of products) {
      const minThreshold = product.minStock || 10 // Default minimum threshold
      const maxThreshold = product.maxStock || 1000 // Default maximum threshold
      const currentStock = product.quantity

      let alertType: AlertType | null = null
      let severity: SeverityLevel | null = null
      let message = ""

      // Check for different alert conditions
      if (currentStock === 0) {
        alertType = "OUT_OF_STOCK"
        severity = "CRITICAL"
        message = `${product.name} is completely out of stock and needs immediate restocking`
      } else if (currentStock <= minThreshold) {
        alertType = "LOW_STOCK"
        // Determine severity based on how close to zero
        if (currentStock <= minThreshold * 0.3) {
          severity = "CRITICAL"
        } else if (currentStock <= minThreshold * 0.5) {
          severity = "HIGH"
        } else {
          severity = "MEDIUM"
        }
        message = `${product.name} is running low with only ${currentStock} units remaining (minimum threshold: ${minThreshold})`
      } else if (currentStock >= maxThreshold) {
        alertType = "OVERSTOCK"
        severity = "MEDIUM"
        message = `${product.name} is overstocked with ${currentStock} units (maximum threshold: ${maxThreshold})`
      }

      // Only create alert if there's an issue
      if (alertType && severity) {
        alerts.push({
          id: `alert-${product.id}-${Date.now()}`, // Generate unique ID
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          currentStock,
          minThreshold,
          maxThreshold,
          alertType,
          severity,
          message,
          isResolved: false,
          createdAt: product.updatedAt.toISOString(), // Use product's last update as alert creation time
        })
      }
    }

    // Sort alerts by severity (Critical first, then High, Medium, Low)
    const severityOrder: Record<SeverityLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json(alerts)
  } catch (error) {
    console.error("Error generating stock alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
