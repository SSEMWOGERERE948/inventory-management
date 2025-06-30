import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all approved orders for the user
    const orders = await prisma.orderRequest.findMany({
      where: {
        userId: session.user.id,
        status: "APPROVED", // Only count approved orders as debt
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
      },
    })

    // Get all payments made by the user
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        amount: true,
      },
    })

    // Calculate totals
    const totalOrderAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const outstandingBalance = totalOrderAmount - totalPayments

    return NextResponse.json({
      totalOrderAmount,
      totalPayments,
      outstandingBalance: Math.max(0, outstandingBalance), // Don't show negative balances
      orders: orders.length,
      payments: payments.length,
    })
  } catch (error) {
    console.error("Error fetching user balance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
