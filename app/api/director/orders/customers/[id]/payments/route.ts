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

    const { amount, description, paymentDate } = await request.json()

    if (!amount || !paymentDate) {
      return NextResponse.json({ error: "Amount and payment date are required" }, { status: 400 })
    }

    const paymentAmount = Number(amount)

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 })
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

    const currentOutstanding = Number(customer.outstandingBalance)

    if (paymentAmount > currentOutstanding) {
      return NextResponse.json(
        { error: `Payment amount (${paymentAmount}) exceeds outstanding balance (${currentOutstanding})` },
        { status: 400 },
      )
    }

    // Start transaction to record payment and update balances
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.customerPayment.create({
        data: {
          customerId: params.id,
          amount: paymentAmount,
          description: description || "Payment received",
          paymentDate: new Date(paymentDate),
          userId: session.user.id,
        },
      })

      // Update customer totals
      await tx.customer.update({
        where: { id: params.id },
        data: {
          totalPaid: {
            increment: paymentAmount,
          },
          outstandingBalance: {
            decrement: paymentAmount,
          },
        },
      })

      // Update unpaid orders (FIFO - oldest first)
      let remainingPayment = paymentAmount
      const unpaidOrders = await tx.customerOrder.findMany({
        where: {
          customerId: params.id,
          isPaid: false,
        },
        orderBy: {
          orderDate: "asc",
        },
      })

      for (const order of unpaidOrders) {
        if (remainingPayment <= 0) break

        const orderRemaining = Number(order.remainingAmount)
        const paymentForThisOrder = Math.min(remainingPayment, orderRemaining)

        await tx.customerOrder.update({
          where: { id: order.id },
          data: {
            paidAmount: {
              increment: paymentForThisOrder,
            },
            remainingAmount: {
              decrement: paymentForThisOrder,
            },
            isPaid: orderRemaining - paymentForThisOrder <= 0,
          },
        })

        remainingPayment -= paymentForThisOrder
      }

      return payment
    })

    return NextResponse.json({
      ...result,
      amount: Number(result.amount),
    })
  } catch (error) {
    console.error("Error recording customer payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
