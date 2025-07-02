import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes } = body

    // Get the order with items
    const order = await prisma.orderRequest.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // If status is being changed to SHIPPED, reduce product quantities
    if (status === "SHIPPED" && order.status !== "SHIPPED") {
      for (const item of order.items) {
        // Check if there's enough stock
        if (item.product.quantity < item.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for ${item.product.name}. Available: ${item.product.quantity}, Required: ${item.quantity}`,
            },
            { status: 400 },
          )
        }

        // Reduce product quantity
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      }
    }

    // Update order status
    const updatedOrder = await prisma.orderRequest.update({
      where: { id: params.id },
      data: {
        status,
        notes,
        approvedAt: status === "APPROVED" ? new Date() : order.approvedAt,
        rejectedAt: status === "REJECTED" ? new Date() : order.rejectedAt,
        shippedAt: status === "SHIPPED" ? new Date() : order.shippedAt,
        fulfilledAt: status === "FULFILLED" ? new Date() : order.fulfilledAt,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
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

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
