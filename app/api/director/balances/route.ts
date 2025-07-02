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
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const userBalances = await Promise.all(
      users.map(async (user) => {
        // Get user's approved orders
        const orders = await prisma.orderRequest.findMany({
          where: {
            userId: user.id,
            status: {
              in: ["APPROVED", "FULFILLED", "SHIPPED"],
            },
          },
          select: {
            totalAmount: true,
          },
        })

        // Get user's payments
        const payments = await prisma.payment.findMany({
          where: {
            userId: user.id,
          },
          select: {
            amount: true,
          },
        })

        const totalOrderAmount = orders.reduce((sum, order) => {
          return sum + Number(order.totalAmount)
        }, 0)

        const totalPayments = payments.reduce((sum, payment) => {
          return sum + Number(payment.amount)
        }, 0)

        const outstandingBalance = Math.max(0, totalOrderAmount - totalPayments)

        return {
          userId: user.id,
          userName: user.name || "Unknown",
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
      (totals, userBalance) => ({
        totalOrderAmount: totals.totalOrderAmount + userBalance.totalOrderAmount,
        totalPayments: totals.totalPayments + userBalance.totalPayments,
        totalOutstanding: totals.totalOutstanding + userBalance.outstandingBalance,
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
