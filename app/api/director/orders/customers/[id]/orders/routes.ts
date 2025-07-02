import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productId, quantity, unitPrice, orderDate } = await request.json()

    if (!productId || !quantity || !unitPrice || !orderDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Verify product exists and get current stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.quantity < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.quantity}, Required: ${quantity}` },
        { status: 400 },
      )
    }

    const totalAmount = Number(unitPrice) * Number(quantity)

    // Start transaction to create order and update stock
    const result = await prisma.$transaction(async (tx) => {
      // Create customer order
      const order = await tx.customerOrder.create({
        data: {
          customerId: params.id,
          productId,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          totalAmount,
          remainingAmount: totalAmount,
          orderDate: new Date(orderDate),
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      })

      // Reduce product stock
      await tx.product.update({
        where: { id: productId },
        data: {
          quantity: {
            decrement: Number(quantity),
          },
        },
      })

      // Update customer totals
      await tx.customer.update({
        where: { id: params.id },
        data: {
          totalCredit: {
            increment: totalAmount,
          },
          outstandingBalance: {
            increment: totalAmount,
          },
        },
      })

      // Check if stock alert needed
      const updatedProduct = await tx.product.findUnique({
        where: { id: productId },
      })

      if (updatedProduct && updatedProduct.quantity <= updatedProduct.minStock) {
        let alertType = "MEDIUM"
        let message = `${updatedProduct.name} is below minimum stock level (${updatedProduct.quantity} remaining)`

        if (updatedProduct.quantity === 0) {
          alertType = "CRITICAL"
          message = `${updatedProduct.name} is out of stock!`
        } else if (updatedProduct.quantity <= 5) {
          alertType = "HIGH"
          message = `${updatedProduct.name} is running low (${updatedProduct.quantity} remaining)`
        }

        // Check if alert already exists
        const existingAlert = await tx.stockAlert.findFirst({
          where: {
            productId,
            companyId: session.user.companyId,
            isResolved: false,
          },
        })

        if (!existingAlert && session.user.companyId) {
          await tx.stockAlert.create({
            data: {
              productId,
              companyId: session.user.companyId,
              alertType,
              message,
            },
          })
        }
      }

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
