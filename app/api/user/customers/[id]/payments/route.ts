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

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 })
    }

    if (!paymentDate) {
      return NextResponse.json({ error: "Payment date is required" }, { status: 400 })
    }

    const paymentAmount = Number(amount)

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
      // Create payment record - FIXED: Added userId field
      const payment = await tx.customerPayment.create({
        data: {
          customerId: params.id,
          userId: session.user.id, // Added this required field
          amount: paymentAmount,
          description: description || null,
          paymentDate: new Date(paymentDate),
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

      // Apply payment to orders (FIFO - oldest first)
      let remainingPayment = paymentAmount

      const unpaidOrders = await tx.customerOrder.findMany({
        where: {
          customerId: params.id,
          remainingAmount: {
            gt: 0,
          },
        },
        orderBy: {
          orderDate: "asc", // Oldest first
        },
      })

      for (const order of unpaidOrders) {
        if (remainingPayment <= 0) break

        const orderRemaining = Number(order.remainingAmount)
        const paymentToApply = Math.min(remainingPayment, orderRemaining)

        await tx.customerOrder.update({
          where: { id: order.id },
          data: {
            paidAmount: {
              increment: paymentToApply,
            },
            remainingAmount: {
              decrement: paymentToApply,
            },
            isPaid: orderRemaining - paymentToApply === 0,
          },
        })

        remainingPayment -= paymentToApply
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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const payments = await prisma.customerPayment.findMany({
      where: {
        customerId: params.id,
      },
      orderBy: {
        paymentDate: "desc",
      },
    })

    const paymentsWithNumbers = payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    }))

    return NextResponse.json(paymentsWithNumbers)
  } catch (error) {
    console.error("Error fetching customer payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
