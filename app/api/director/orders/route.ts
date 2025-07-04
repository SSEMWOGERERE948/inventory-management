import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET - Fetch all orders for director's company
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Director orders GET - Starting request")
    const session = await getServerSession(authOptions)
    console.log("👤 Director orders - Session:", {
      exists: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      companyId: session?.user?.companyId,
    })

    if (!session) {
      console.log("❌ Director orders - No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "COMPANY_DIRECTOR") {
      console.log("❌ Director orders - User is not a director:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Director role required" }, { status: 403 })
    }

    console.log("📋 Director orders - Fetching orders for company:", session.user.companyId)
    const orders = await prisma.orderRequest.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                stockQuantity: true,
                minStockLevel: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log("✅ Director orders - Found orders:", orders.length)
    if (orders.length > 0) {
      console.log("📄 Director orders - Sample order:", {
        id: orders[0].id,
        status: orders[0].status,
        totalAmount: orders[0].totalAmount,
        itemCount: orders[0].items.length,
        userName: orders[0].user.name,
      })
    }

    return NextResponse.json(orders)
  } catch (error) {
    console.error("💥 Error fetching director orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update order status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    console.log("🔍 Director orders PATCH - Starting request")
    const session = await getServerSession(authOptions)
    console.log("👤 Director orders PATCH - Session:", {
      exists: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      companyId: session?.user?.companyId,
    })

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      console.log("❌ Director orders PATCH - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, status, notes } = body
    console.log("📝 Director orders PATCH - Request:", { orderId, status, notes })

    if (!orderId || !status) {
      console.log("❌ Director orders PATCH - Missing required fields")
      return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 })
    }

    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "FULFILLED", "SHIPPED", "DELIVERED"]
    if (!validStatuses.includes(status)) {
      console.log("❌ Director orders PATCH - Invalid status:", status)
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Check if order exists and belongs to the company
    const existingOrder = await prisma.orderRequest.findFirst({
      where: {
        id: orderId,
        companyId: session.user.companyId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                stockQuantity: true,
                minStockLevel: true,
              },
            },
          },
        },
      },
    })

    if (!existingOrder) {
      console.log("❌ Director orders PATCH - Order not found or unauthorized")
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 })
    }

    console.log("📋 Director orders PATCH - Existing order found:", {
      id: existingOrder.id,
      currentStatus: existingOrder.status,
      newStatus: status,
      itemCount: existingOrder.items.length,
    })

    // If shipping the order, we need to handle stock deduction
    if (status === "SHIPPED" && existingOrder.status !== "SHIPPED") {
      console.log("🚢 Director orders PATCH - Processing shipment with stock deduction")

      // Validate stock availability for all items
      const stockValidation: { productId: string; productName: string; currentStock: number; requiredQuantity: number; newStock: number }[] = []
      for (const item of existingOrder.items) {
        const product = item.product
        const currentStock = product.stockQuantity ?? product.quantity ?? 0
        const requiredQuantity = item.quantity

        console.log(`📊 Stock check for ${product.name}:`, {
          currentStock,
          requiredQuantity,
          available: currentStock >= requiredQuantity,
        })

        if (currentStock < requiredQuantity) {
          console.log(`❌ Insufficient stock for ${product.name}`)
          return NextResponse.json(
            {
              error: `Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${requiredQuantity}`,
            },
            { status: 400 },
          )
        }

        stockValidation.push({
          productId: product.id,
          productName: product.name,
          currentStock,
          requiredQuantity,
          newStock: currentStock - requiredQuantity,
        })
      }

      console.log("✅ All stock validations passed, proceeding with transaction")

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        console.log("🔄 Starting transaction for order shipment")

        // Update order status first
        const updatedOrder = await tx.orderRequest.update({
          where: { id: orderId },
          data: {
            status: "SHIPPED",
            shippedAt: new Date(),
            updatedAt: new Date(),
            notes: notes || existingOrder.notes,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    quantity: true,
                    stockQuantity: true,
                    minStockLevel: true,
                  },
                },
              },
            },
          },
        })

        console.log("✅ Order status updated to SHIPPED")

        // Deduct stock for each item
        const stockMovements = []
        for (const stockCheck of stockValidation) {
          console.log(
            `📉 Updating stock for ${stockCheck.productName}: ${stockCheck.currentStock} → ${stockCheck.newStock}`,
          )

          // Update both stockQuantity and quantity fields for compatibility
          await tx.product.update({
            where: { id: stockCheck.productId },
            data: {
              stockQuantity: stockCheck.newStock,
              quantity: stockCheck.newStock, // Update legacy field too
              lastStockUpdate: new Date(),
            },
          })

          console.log(`✅ Stock updated for ${stockCheck.productName}`)

          // Create stock movement record
          try {
            const movement = await tx.stockMovement.create({
              data: {
                productId: stockCheck.productId,
                movementType: "OUT",
                quantity: stockCheck.requiredQuantity,
                previousStock: stockCheck.currentStock,
                newStock: stockCheck.newStock,
                referenceType: "ORDER",
                referenceId: orderId,
                notes: `Stock deducted for order ${orderId} - shipped by ${session.user.name}`,
                createdBy: session.user.id,
              },
            })
            stockMovements.push(movement)
            console.log(`✅ Stock movement recorded for ${stockCheck.productName}`)
          } catch (movementError: any) {
            console.warn(`⚠️ Stock movement tracking failed for ${stockCheck.productName}:`, movementError.message)
            // Don't fail the entire transaction for movement record issues
          }

          // Check for stock alerts
          try {
            await checkAndCreateStockAlerts(
              tx,
              stockCheck.productId,
              stockCheck.newStock,
              existingOrder.items.find((item) => item.productId === stockCheck.productId)?.product.minStockLevel || 10,
              session.user.companyId,
            )
            console.log(`✅ Stock alerts checked for ${stockCheck.productName}`)
          } catch (alertError: any) {
            console.warn(`⚠️ Stock alert creation failed for ${stockCheck.productName}:`, alertError.message)
            // Don't fail the transaction for alert issues
          }
        }

        console.log("✅ Transaction completed successfully")
        return { order: updatedOrder, stockMovements, stockUpdates: stockValidation }
      })

      console.log("🎉 Order shipped successfully with stock deduction:", {
        orderId: result.order.id,
        stockUpdates: result.stockUpdates.length,
        movementRecords: result.stockMovements.length,
      })

      return NextResponse.json({
        ...result.order,
        stockUpdates: result.stockUpdates,
        message: "Order shipped successfully and stock updated",
      })
    } else {
      // Regular status update without stock changes
      console.log("📝 Regular status update (no stock changes)")

      // Prepare update data with timestamp fields
      const updateData: any = {
        status,
        updatedAt: new Date(),
      }

      // Add notes if provided
      if (notes) {
        updateData.notes = notes
      }

      // Set appropriate timestamp based on status
      switch (status) {
        case "APPROVED":
          updateData.approvedAt = new Date()
          break
        case "REJECTED":
          updateData.rejectedAt = new Date()
          break
        case "FULFILLED":
          updateData.fulfilledAt = new Date()
          break
        case "SHIPPED":
          updateData.shippedAt = new Date()
          break
      }

      console.log("💾 Director orders PATCH - Update data:", updateData)

      const order = await prisma.orderRequest.update({
        where: {
          id: orderId,
        },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  quantity: true,
                  stockQuantity: true,
                  minStockLevel: true,
                },
              },
            },
          },
        },
      })

      console.log("✅ Director orders PATCH - Order updated successfully:", {
        id: order.id,
        status: order.status,
        approvedAt: order.approvedAt,
        rejectedAt: order.rejectedAt,
        fulfilledAt: order.fulfilledAt,
        shippedAt: order.shippedAt,
      })

      return NextResponse.json(order)
    }
  } catch (error) {
    console.error("💥 Error updating director order:", error)
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
