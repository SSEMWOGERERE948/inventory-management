import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = params.id
    const { productId, quantity, unitPrice, orderDate } = await request.json()

    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate customer belongs to user
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        userId: session.user.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check if user has enough inventory
    const userInventory = await prisma.userInventory.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (!userInventory || userInventory.quantityAvailable < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient inventory. Available: ${userInventory?.quantityAvailable || 0}, Requested: ${quantity}`,
        },
        { status: 400 },
      )
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const totalAmount = quantity * unitPrice

    // Create customer order and update inventory in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create customer order
      const order = await tx.customerOrder.create({
        data: {
          customerId,
          productId,
          quantity,
          unitPrice,
          totalAmount,
          isPaid: false,
          paidAmount: 0,
          remainingAmount: totalAmount,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
        },
      })

      // Update customer balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalCredit: {
            increment: totalAmount,
          },
          outstandingBalance: {
            increment: totalAmount,
          },
        },
      })

      // Update user inventory
      await tx.userInventory.update({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId,
          },
        },
        data: {
          quantityUsed: {
            increment: quantity,
          },
          quantityAvailable: {
            decrement: quantity,
          },
          lastUpdated: new Date(),
        },
      })

      return order
    })

    return NextResponse.json({
      ...result,
      unitPrice: Number(result.unitPrice),
      totalAmount: Number(result.totalAmount),
      paidAmount: Number(result.paidAmount),
      remainingAmount: Number(result.remainingAmount),
    })
  } catch (error) {
    console.error("Error creating customer order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = params.id

    // Validate customer belongs to user
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        userId: session.user.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Get customer orders
    const orders = await prisma.customerOrder.findMany({
      where: {
        customerId,
      },
      include: {
        product: true,
      },
      orderBy: {
        orderDate: "desc",
      },
    })

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        unitPrice: Number(order.unitPrice),
        totalAmount: Number(order.totalAmount),
        paidAmount: Number(order.paidAmount),
        remainingAmount: Number(order.remainingAmount),
        product: {
          ...order.product,
          price: Number(order.product.price),
        },
      })),
    )
  } catch (error) {
    console.error("Error fetching customer orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
