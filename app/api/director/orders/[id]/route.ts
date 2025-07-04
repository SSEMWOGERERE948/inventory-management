import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status, notes } = await request.json()
    const orderId = params.id

    console.log(`🔄 Updating order ${orderId} to status: ${status}`)

    // Get the order with items
    const order = await prisma.orderRequest.findUnique({
      where: { id: orderId },
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
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log(`📦 Order found: ${order.id} for user: ${order.user.name}`)

    // Update the order status
    const updatedOrder = await prisma.orderRequest.update({
      where: { id: orderId },
      data: {
        status,
        notes,
        updatedAt: new Date(),
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

    // If status is SHIPPED, create or update user inventory
    if (status === "SHIPPED") {
      console.log(`🚚 Order shipped, updating user inventory for user: ${order.userId}`)

      // Process each item in the order
      for (const item of order.items) {
        console.log(`📦 Processing item: ${item.product.name} x ${item.quantity}`)

        // Check if user already has this product in inventory
        const existingInventory = await prisma.userInventory.findFirst({
          where: {
            userId: order.userId,
            productId: item.productId,
          },
        })

        if (existingInventory) {
          // Update existing inventory
          console.log(`📈 Updating existing inventory for product: ${item.product.name}`)
          await prisma.userInventory.update({
            where: { id: existingInventory.id },
            data: {
              quantityReceived: existingInventory.quantityReceived + item.quantity,
              quantityAvailable: existingInventory.quantityAvailable + item.quantity,
              lastUpdated: new Date(),
            },
          })
        } else {
          // Create new inventory record
          console.log(`📦 Creating new inventory record for product: ${item.product.name}`)
          await prisma.userInventory.create({
            data: {
              userId: order.userId,
              productId: item.productId,
              quantityReceived: item.quantity,
              quantityUsed: 0,
              quantityAvailable: item.quantity,
              lastUpdated: new Date(),
            },
          })
        }
      }

      console.log(`✅ Inventory updated successfully for user: ${order.user.name}`)
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orderId = params.id

    const order = await prisma.orderRequest.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if user has permission to view this order
    if (session.user.role !== "COMPANY_DIRECTOR" && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
