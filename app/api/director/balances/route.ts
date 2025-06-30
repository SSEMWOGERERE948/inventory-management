import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users in the company
    const users = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: "USER", // Only regular users, not directors
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Calculate balance for each user
    const userBalances = await Promise.all(
      users.map(async (user) => {
        // Get approved orders
        const orders = await prisma.orderRequest.findMany({
          where: {
            userId: user.id,
            status: "APPROVED",
          },
          select: {
            totalAmount: true,
          },
        })

        // Get payments
        const payments = await prisma.payment.findMany({
          where: {
            userId: user.id,
          },
          select: {
            amount: true,
          },
        })

        const totalOrderAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
        const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        const outstandingBalance = Math.max(0, totalOrderAmount - totalPayments)

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          totalOrderAmount,
          totalPayments,
          outstandingBalance,
          ordersCount: orders.length,
          paymentsCount: payments.length,
        }
      }),
    )

    // Calculate company totals
    const companyTotals = userBalances.reduce(
      (totals, user) => ({
        totalOrderAmount: totals.totalOrderAmount + user.totalOrderAmount,
        totalPayments: totals.totalPayments + user.totalPayments,
        totalOutstanding: totals.totalOutstanding + user.outstandingBalance,
      }),
      { totalOrderAmount: 0, totalPayments: 0, totalOutstanding: 0 },
    )

    return NextResponse.json({
      userBalances,
      companyTotals,
    })
  } catch (error) {
    console.error("Error fetching company balances:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
