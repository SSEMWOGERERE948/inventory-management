import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["COMPANY_DIRECTOR", "DIRECTOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orderId = params.id

    console.log(`[DIRECTOR_SHIPPING] Starting to ship order: ${orderId}`)

    // Get the order with items - verify it belongs to director's company
    const order = await prisma.orderRequest.findFirst({
      where: {
        id: orderId,
        user: {
          companyId: session.user.companyId,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    })

    if (!order) {
      console.log(`[DIRECTOR_SHIPPING] Order not found or access denied: ${orderId}`)
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 })
    }

    if (order.status === "SHIPPED") {
      console.log(`[DIRECTOR_SHIPPING] Order already shipped: ${orderId}`)
      return NextResponse.json({ error: "Order already shipped" }, { status: 400 })
    }

    if (order.status === "CANCELLED") {
      console.log(`[DIRECTOR_SHIPPING] Cannot ship cancelled order: ${orderId}`)
      return NextResponse.json({ error: "Cannot ship cancelled order" }, { status: 400 })
    }

    console.log(`[DIRECTOR_SHIPPING] Order found with ${order.items.length} items`)

    // Check stock availability for all items AT SHIPPING TIME
    const stockValidation = []
    for (const item of order.items) {
      const currentStock = item.product.stockQuantity || item.product.quantity || 0
      const isAvailable = currentStock >= item.quantity

      console.log(
        `[DIRECTOR_SHIPPING] Product ${item.product.name}: requested=${item.quantity}, available=${currentStock}, sufficient=${isAvailable}`,
      )

      stockValidation.push({
        productId: item.productId,
        productName: item.product.name,
        requestedQuantity: item.quantity,
        availableStock: currentStock,
        isAvailable,
      })
    }

    // Check if any items are out of stock
    const outOfStockItems = stockValidation.filter((item) => !item.isAvailable)

    if (outOfStockItems.length > 0) {
      console.log(`[DIRECTOR_SHIPPING] Insufficient stock for ${outOfStockItems.length} items`)
      return NextResponse.json(
        {
          error: "Insufficient stock for some items",
          outOfStockItems,
          allItems: stockValidation,
        },
        { status: 400 },
      )
    }

    console.log(`[DIRECTOR_SHIPPING] All items have sufficient stock, proceeding with shipping`)

    // All items are available, proceed with shipping and DEDUCT STOCK
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[DIRECTOR_SHIPPING] Starting transaction for order ${orderId}`)

      // Update order status first
      const updatedOrder = await tx.orderRequest.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED",
          shippedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      })

      console.log(`[DIRECTOR_SHIPPING] Order status updated to SHIPPED`)

      // DEDUCT STOCK and create movement records
      const stockMovements = []
      for (const item of order.items) {
        const product = item.product
        const currentStock = product.stockQuantity || product.quantity || 0
        const newStock = Math.max(0, currentStock - item.quantity)

        console.log(
          `[DIRECTOR_SHIPPING] Updating stock for ${product.name}: ${currentStock} -> ${newStock} (deducting ${item.quantity})`,
        )

        // Update product stock (both fields for compatibility)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: newStock,
            quantity: newStock, // Update legacy field too
            lastStockUpdate: new Date(),
          },
        })

        console.log(`[DIRECTOR_SHIPPING] Stock updated for product ${product.name}`)

        // Create stock movement record if the table exists
        try {
          const movement = await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "OUT",
              quantity: item.quantity,
              previousStock: currentStock,
              newStock: newStock,
              referenceType: "ORDER",
              referenceId: orderId,
              notes: `Stock deducted for order ${orderId} - shipped to ${order.user.name}`,
              createdBy: session.user.id,
            },
          })
          stockMovements.push(movement)
          console.log(`[DIRECTOR_SHIPPING] Stock movement recorded for ${product.name}`)
        } catch (movementError: any) {
          console.log(`[DIRECTOR_SHIPPING] Stock movement tracking not available: ${movementError.message}`)
        }

        // Check for stock alerts if the table exists
        try {
          await checkAndCreateStockAlerts(
            tx,
            item.productId,
            newStock,
            product.minStockLevel || product.minStock || 10,
            product.companyId,
          )
          console.log(`[DIRECTOR_SHIPPING] Stock alerts checked for ${product.name}`)
        } catch (alertError: any) {
          console.log(`[DIRECTOR_SHIPPING] Stock alert system not available: ${alertError.message}`)
        }
      }

      console.log(`[DIRECTOR_SHIPPING] Transaction completed successfully`)
      return { order: updatedOrder, stockMovements }
    })

    console.log(`[DIRECTOR_SHIPPING] Order ${orderId} shipped successfully`)

    return NextResponse.json({
      success: true,
      message: "Order shipped successfully and stock updated",
      order: result.order,
      stockMovements: result.stockMovements,
    })
  } catch (error) {
    console.error(`[DIRECTOR_SHIPPING] Error shipping order ${params.id}:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to check and create stock alerts
async function checkAndCreateStockAlerts(
  tx: any,
  productId: string,
  currentStock: number,
  minStockLevel: number,
  companyId: string,
) {
  if (currentStock > minStockLevel) {
    // Resolve existing alerts if stock is now above minimum
    try {
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
    } catch (error: any) {
      console.log("Could not resolve stock alerts:", error.message)
    }
    return
  }

  // Check if we need to create new alerts
  try {
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
          companyId,
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
  } catch (error: any) {
    console.log("Could not create stock alert:", error.message)
  }
}
