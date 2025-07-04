import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productId, quantity, unitPrice } = await request.json()
    const customerId = params.id

    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 })
    }

    // Check if customer exists and belongs to user
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: session.user.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check user's inventory for this product
    const userInventory = await prisma.userInventory.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId,
        },
      },
      include: {
        product: true,
      },
    })

    if (!userInventory) {
      return NextResponse.json({ error: "Product not found in your inventory" }, { status: 400 })
    }

    if (userInventory.quantityAvailable < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient inventory. Available: ${userInventory.quantityAvailable}, Requested: ${quantity}`,
        },
        { status: 400 },
      )
    }

    const totalAmount = Number(unitPrice) * quantity

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create customer order
      const customerOrder = await tx.customerOrder.create({
        data: {
          customerId,
          productId,
          quantity,
          unitPrice,
          totalAmount,
          orderDate: new Date(),
          isPaid: false,
          paidAmount: 0,
          remainingAmount: totalAmount,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      })

      // Update user inventory
      await tx.userInventory.update({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId: productId,
          },
        },
        data: {
          quantityUsed: userInventory.quantityUsed + quantity,
          quantityAvailable: userInventory.quantityAvailable - quantity,
          lastUpdated: new Date(),
        },
      })

      // Update customer totals
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

      return customerOrder
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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = params.id

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: session.user.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const orders = await prisma.customerOrder.findMany({
      where: {
        customerId,
      },
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
      orderBy: {
        orderDate: "desc",
      },
    })

    const ordersWithNumbers = orders.map((order) => ({
      ...order,
      unitPrice: Number(order.unitPrice),
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      remainingAmount: Number(order.remainingAmount),
    }))

    return NextResponse.json(ordersWithNumbers)
  } catch (error) {
    console.error("Error fetching customer orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
