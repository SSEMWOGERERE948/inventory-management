import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 User orders GET - Starting request")

    const session = await getServerSession(authOptions)
    console.log("👤 User orders - Session:", {
      exists: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      companyId: session?.user?.companyId,
    })

    if (!session) {
      console.log("❌ User orders - No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow both USER and COMPANY_DIRECTOR roles to view orders
    if (!["USER", "COMPANY_DIRECTOR"].includes(session.user.role)) {
      console.log("❌ User orders - Invalid role:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Invalid role" }, { status: 403 })
    }

    console.log("📋 User orders - Fetching orders for user:", session.user.id)

    const orders = await prisma.orderRequest.findMany({
      where: {
        userId: session.user.id,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log("✅ User orders - Found orders:", orders.length)
    if (orders.length > 0) {
      console.log("📄 User orders - Sample order:", {
        id: orders[0].id,
        status: orders[0].status,
        totalAmount: orders[0].totalAmount,
        itemCount: orders[0].items.length,
      })
    }

    return NextResponse.json(orders)
  } catch (error) {
    console.error("💥 Error fetching user orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 User orders POST - Starting request")

    const session = await getServerSession(authOptions)
    console.log("👤 User orders POST - Session:", {
      exists: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      companyId: session?.user?.companyId,
    })

    if (!session) {
      console.log("❌ User orders POST - No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow both USER and COMPANY_DIRECTOR roles to create orders
    if (!["USER", "COMPANY_DIRECTOR"].includes(session.user.role)) {
      console.log("❌ User orders POST - Invalid role:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Invalid role" }, { status: 403 })
    }

    const body = await request.json()
    const { items, notes } = body

    console.log("📦 User orders POST - Request body:", { itemCount: items?.length, hasNotes: !!notes })

    if (!items || items.length === 0) {
      console.log("❌ User orders POST - No items provided")
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    // Calculate total amount and prepare order items
    let totalAmount = 0
    const orderItems = []

    console.log("💰 User orders POST - Processing items...")

    for (const item of items) {
      console.log("🔍 Processing item:", { productId: item.productId, quantity: item.quantity })

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        console.log("❌ Product not found:", item.productId)
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 })
      }

      const itemTotal = Number(product.price) * item.quantity
      totalAmount += itemTotal

      console.log("💵 Item calculation:", {
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        itemTotal,
      })

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        totalPrice: itemTotal,
      })
    }

    console.log("💰 Total order amount:", totalAmount)

    // Create order request
    const orderRequest = await prisma.orderRequest.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        totalAmount,
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    console.log("✅ User orders POST - Order created successfully:", orderRequest.id)

    return NextResponse.json(orderRequest)
  } catch (error) {
    console.error("💥 Error creating user order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
