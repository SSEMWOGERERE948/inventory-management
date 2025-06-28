import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
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
    })

    if (!existingOrder) {
      console.log("❌ Director orders PATCH - Order not found or unauthorized")
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 })
    }

    console.log("📋 Director orders PATCH - Existing order found:", {
      id: existingOrder.id,
      currentStatus: existingOrder.status,
      newStatus: status,
    })

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
  } catch (error) {
    console.error("💥 Error updating director order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
