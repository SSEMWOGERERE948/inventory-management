import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's approved orders total
    const approvedOrders = await prisma.orderRequest.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ["APPROVED", "FULFILLED", "SHIPPED"],
        },
      },
      select: {
        totalAmount: true,
      },
    })

    // Get user's payments total
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        amount: true,
      },
    })

    // Get user's credit information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        creditLimit: true,
        creditUsed: true,
      },
    })

    // Calculate totals
    const totalOrderAmount = approvedOrders.reduce((sum, order) => {
      return sum + Number(order.totalAmount)
    }, 0)

    const totalPayments = payments.reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const outstandingBalance = Math.max(0, totalOrderAmount - totalPayments)

    const creditLimit = Number(user?.creditLimit || 0)
    const creditUsed = Number(user?.creditUsed || 0)
    const availableCredit = Math.max(0, creditLimit - creditUsed)

    return NextResponse.json({
      totalOrderAmount,
      totalPayments,
      outstandingBalance,
      orders: approvedOrders.length,
      payments: payments.length,
      creditLimit,
      creditUsed,
      availableCredit,
    })
  } catch (error) {
    console.error("Error fetching user balance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
