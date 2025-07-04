import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Decimal } from "@prisma/client/runtime/library"

export const dynamic = "force-dynamic"

// Helper function to convert Decimal to number
function decimalToNumber(value: Decimal | number | null): number {
  if (value === null) return 0
  if (typeof value === "number") return value
  return value.toNumber()
}

interface OrderItem {
  productId: string
  quantity: number
}

interface StockValidationItem {
  productId: string
  productName: string
  requestedQuantity: number
  availableStock: number
  isAvailable: boolean
  product: {
    id: string
    name: string
    price: number
    stockQuantity: number | null
    quantity: number | null
    minStockLevel: number | null
    minStock: number | null
    companyId: string
  }
}

// Get user's orders
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create new order (no stock deduction - only when shipped)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { items, notes } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Order items are required" }, { status: 400 })
    }

    console.log(`[ORDER_CREATE] Creating order for user ${session.user.id} with ${items.length} items`)

    // Validate items and check if products exist (but don't deduct stock yet)
    const stockValidation: StockValidationItem[] = []
    let companyId = ""

    for (const item of items as OrderItem[]) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 })
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          stockQuantity: true,
          quantity: true,
          minStockLevel: true,
          minStock: true,
          companyId: true,
        },
      })

      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 })
      }

      // Set companyId from first product
      if (!companyId) {
        companyId = product.companyId
      }

      const currentStock = product.stockQuantity || product.quantity || 0
      const isAvailable = currentStock >= item.quantity

      console.log(
        `[ORDER_CREATE] Product ${product.name}: requested=${item.quantity}, available=${currentStock}, sufficient=${isAvailable}`,
      )

      stockValidation.push({
        productId: item.productId,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableStock: currentStock,
        isAvailable,
        product: {
          id: product.id,
          name: product.name,
          price: decimalToNumber(product.price),
          stockQuantity: product.stockQuantity,
          quantity: product.quantity,
          minStockLevel: product.minStockLevel,
          minStock: product.minStock,
          companyId: product.companyId,
        },
      })
    }

    // Check if any items would be out of stock (for validation only)
    const outOfStockItems = stockValidation.filter((item) => !item.isAvailable)
    if (outOfStockItems.length > 0) {
      console.log(`[ORDER_CREATE] Out of stock items found: ${outOfStockItems.length}`)
      return NextResponse.json(
        {
          error: "Insufficient stock for some items",
          outOfStockItems: outOfStockItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requestedQuantity: item.requestedQuantity,
            availableStock: item.availableStock,
          })),
        },
        { status: 400 },
      )
    }

    // Calculate total amount
    const totalAmount = stockValidation.reduce((sum, item) => {
      return sum + item.product.price * item.requestedQuantity
    }, 0)

    // Create order items data
    const orderItemsData = stockValidation.map((item) => ({
      productId: item.productId,
      quantity: item.requestedQuantity,
      unitPrice: item.product.price,
      totalPrice: item.product.price * item.requestedQuantity,
    }))

    // Create the order (no stock deduction yet)
    const order = await prisma.orderRequest.create({
      data: {
        userId: session.user.id,
        companyId,
        status: "PENDING",
        notes: notes || null,
        totalAmount,
        items: {
          create: orderItemsData,
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
                price: true,
              },
            },
          },
        },
      },
    })

    console.log(`[ORDER_CREATE] Order created successfully: ${order.id}`)

    return NextResponse.json({
      success: true,
      message: "Order created successfully. Stock will be deducted when shipped.",
      order,
    })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
