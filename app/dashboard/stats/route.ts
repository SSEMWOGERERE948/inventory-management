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

    if (session.user.role === "ADMIN") {
      const [
        totalProducts,
        totalOrders,
        totalCompanies,
        totalUsers,
        lowStockProducts,
        pendingOrders,
        totalPayments,
        totalExpenses,
      ] = await Promise.all([
        prisma.product.count(),
        prisma.orderRequest.count(),
        prisma.company.count(),
        prisma.user.count(),
        prisma.product.count({
          where: {
            quantity: {
              lte: 5,
            },
          },
        }),
        prisma.orderRequest.count({
          where: {
            status: "PENDING",
          },
        }),
        prisma.payment.aggregate({
          _sum: {
            amount: true,
          },
        }),
        prisma.expense.aggregate({
          _sum: {
            amount: true,
          },
        }),
      ])

      return NextResponse.json({
        totalProducts,
        totalOrders,
        totalCompanies,
        totalUsers,
        lowStockProducts,
        pendingOrders,
        totalPayments: totalPayments._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
      })
    } else {
      const [userOrders, userPayments, userExpenses] = await Promise.all([
        prisma.orderRequest.count({
          where: { userId: session.user.id },
        }),
        prisma.payment.aggregate({
          where: { userId: session.user.id },
          _sum: {
            amount: true,
          },
        }),
        prisma.expense.aggregate({
          where: { userId: session.user.id },
          _sum: {
            amount: true,
          },
        }),
      ])

      return NextResponse.json({
        userOrders,
        userPayments: userPayments._sum.amount || 0,
        userExpenses: userExpenses._sum.amount || 0,
      })
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
