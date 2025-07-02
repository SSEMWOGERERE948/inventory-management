import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 User orders GET - Starting request")

    const session = await getServerSession(authOptions)
    console.log("👤 User orders GET - Session:", {
      exists: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      companyId: session?.user?.companyId,
    })

    if (!session) {
      console.log("❌ User orders GET - No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["USER", "COMPANY_DIRECTOR"].includes(session.user.role)) {
      console.log("❌ User orders GET - Invalid role:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Invalid role" }, { status: 403 })
    }

    console.log("📦 User orders GET - Fetching orders for user:", session.user.id)

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

    console.log("✅ User orders GET - Found orders:", orders.length)

    // Convert Decimal fields to numbers
    const ordersWithNumbers = orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }))

    return NextResponse.json(ordersWithNumbers)
  } catch (error) {
    console.error("💥 Error fetching user orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🆕 User orders POST - Starting request")

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

    if (!["USER", "COMPANY_DIRECTOR"].includes(session.user.role)) {
      console.log("❌ User orders POST - Invalid role:", session.user.role)
      return NextResponse.json({ error: "Unauthorized - Invalid role" }, { status: 403 })
    }

    if (!session.user.companyId) {
      console.log("❌ User orders POST - No company ID")
      return NextResponse.json({ error: "User not associated with a company" }, { status: 400 })
    }

    const body = await request.json()
    const { items, notes } = body

    console.log("📝 User orders POST - Request body:", { itemCount: items?.length, notes })

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("❌ User orders POST - Invalid items")
      return NextResponse.json({ error: "Items are required" }, { status: 400 })
    }

    // Validate and fetch product details
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: session.user.companyId,
      },
    })

    console.log("🛍️ User orders POST - Found products:", products.length)

    if (products.length !== productIds.length) {
      console.log("❌ User orders POST - Some products not found")
      return NextResponse.json({ error: "Some products not found" }, { status: 400 })
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 })
      }
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Required: ${item.quantity}`,
          },
          { status: 400 },
        )
      }
    }

    // Calculate total amount
    let totalAmount = 0
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      const unitPrice = Number(product.price)
      const quantity = Number(item.quantity)
      const totalPrice = unitPrice * quantity

      totalAmount += totalPrice

      return {
        productId: item.productId,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
      }
    })

    console.log("💰 User orders POST - Total amount:", totalAmount)

    // Create the order and reduce stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.orderRequest.create({
        data: {
          userId: session.user.id,
          companyId: session.user.companyId,
          totalAmount: totalAmount,
          notes: notes || null,
          items: {
            create: orderItems,
          },
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
      })

      // Reduce product quantities immediately when order is placed
      for (const item of orderItems) {
        const product = products.find((p) => p.id === item.productId)
        if (product) {
          const newQuantity = product.quantity - item.quantity

          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: newQuantity },
          })

          // Create stock alert if needed
          if (newQuantity <= product.minStock) {
            let alertType = "MEDIUM"
            let message = `${product.name} is below minimum stock level (${newQuantity} remaining)`

            if (newQuantity === 0) {
              alertType = "CRITICAL"
              message = `${product.name} is out of stock!`
            } else if (newQuantity <= 5) {
              alertType = "HIGH"
              message = `${product.name} is running low (${newQuantity} remaining)`
            }

            // Check if alert already exists
            const existingAlert = await tx.stockAlert.findFirst({
              where: {
                productId: item.productId,
                companyId: session.user.companyId,
                isResolved: false,
              },
            })

            if (!existingAlert) {
              await tx.stockAlert.create({
                data: {
                  productId: item.productId,
                  companyId: session.user.companyId,
                  alertType,
                  message,
                },
              })
            }
          }
        }
      }

      return newOrder
    })

    console.log("✅ User orders POST - Order created:", order.id)

    // Convert Decimal fields to numbers
    const orderWithNumbers = {
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }

    return NextResponse.json(orderWithNumbers, { status: 201 })
  } catch (error) {
    console.error("💥 Error creating user order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
