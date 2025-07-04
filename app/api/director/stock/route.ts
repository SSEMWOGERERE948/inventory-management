import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Get stock information for all products
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["ADMIN", "COMPANY_DIRECTOR", "DIRECTOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const alertsOnly = searchParams.get("alerts") === "true"

    if (alertsOnly) {
      // Get products with stock alerts - need to compare stockQuantity with minStockLevel
      const lowStockProducts = await prisma.product.findMany({
        where: {
          companyId: session.user.companyId,
          isActive: true,
          OR: [
            { stockQuantity: { lte: 0 } }, // Out of stock
            // We'll filter low stock in JavaScript since Prisma can't compare fields directly
          ],
        },
        include: {
          category: true,
          stockAlerts: {
            where: { isResolved: false },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { stockQuantity: "asc" },
      })

      // Filter for low stock products in JavaScript
      const filteredProducts = lowStockProducts.filter((product) => {
        const currentStock = product.stockQuantity || 0
        const minLevel = product.minStockLevel || product.minStock || 10
        return currentStock <= minLevel
      })

      return NextResponse.json(filteredProducts)
    }

    // Get all products with stock information
    const products = await prisma.product.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      include: {
        category: true,
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 5, // Last 5 movements
        },
        stockAlerts: {
          where: { isResolved: false },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching stock information:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update stock levels
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["ADMIN", "COMPANY_DIRECTOR", "DIRECTOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productId, quantity, movementType, notes } = await request.json()

    if (!productId || quantity === undefined || !movementType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get current product stock
    const product = await prisma.product.findUnique({
      where: { id: productId, companyId: session.user.companyId },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const previousStock = product.stockQuantity || product.quantity || 0
    let newStock = previousStock

    // Calculate new stock based on movement type
    switch (movementType) {
      case "IN": // Adding stock
        newStock = previousStock + Math.abs(quantity)
        break
      case "OUT": // Removing stock
        newStock = Math.max(0, previousStock - Math.abs(quantity))
        break
      case "ADJUSTMENT": // Direct adjustment
        newStock = Math.max(0, quantity)
        break
      default:
        return NextResponse.json({ error: "Invalid movement type" }, { status: 400 })
    }

    // Update product stock and create movement record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update product stock - update both stockQuantity and quantity for backward compatibility
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newStock,
          quantity: newStock, // Keep quantity in sync for backward compatibility
          lastStockUpdate: new Date(),
        },
      })

      // Create stock movement record if the table exists
      try {
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            movementType,
            quantity: Math.abs(quantity),
            previousStock,
            newStock,
            referenceType: "MANUAL",
            notes: notes || `Manual ${movementType.toLowerCase()} by ${session.user.name}`,
            createdBy: session.user.id,
          },
        })

        // Check for stock alerts
        await checkAndCreateStockAlerts(tx, productId, newStock, product.minStockLevel || product.minStock || 10)

        return { product: updatedProduct, movement }
      } catch (stockMovementError) {
        // If stockMovement table doesn't exist, just update the product
        console.log("StockMovement table not available, updating product only")

        // Check for stock alerts
        await checkAndCreateStockAlerts(tx, productId, newStock, product.minStockLevel || product.minStock || 10)

        return { product: updatedProduct, movement: null }
      }
    })

    return NextResponse.json({
      success: true,
      product: result.product,
      movement: result.movement,
    })
  } catch (error) {
    console.error("Error updating stock:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to check and create stock alerts
async function checkAndCreateStockAlerts(tx: any, productId: string, currentStock: number, minStockLevel: number) {
  try {
    // Resolve existing alerts if stock is now above minimum
    if (currentStock > minStockLevel) {
      await tx.stockAlert.updateMany({
        where: {
          productId,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      })
      return
    }

    // Check if we need to create new alerts
    const existingAlert = await tx.stockAlert.findFirst({
      where: {
        productId,
        isResolved: false,
      },
    })

    if (!existingAlert) {
      const alertType = currentStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK"

      await tx.stockAlert.create({
        data: {
          productId,
          companyId: (await tx.product.findUnique({ where: { id: productId } })).companyId,
          alertType,
          message:
            currentStock === 0
              ? `Product is out of stock`
              : `Product stock is low: ${currentStock} units remaining (minimum: ${minStockLevel})`,
          currentStock,
          thresholdValue: minStockLevel,
        },
      })
    }
  } catch (alertError) {
    console.log("Stock alerts not available:",alertError)
    // Continue without alerts if the table doesn't exist
  }
}
