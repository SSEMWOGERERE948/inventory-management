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

    const companyId = session.user.companyId

    // Get basic stats
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      lowStockProducts,
      payments,
      expenses,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.orderRequest.count({ where: { companyId } }),
      prisma.orderRequest.count({ where: { companyId, status: "PENDING" } }),
      prisma.orderRequest.count({ where: { companyId, status: "APPROVED" } }),
      prisma.orderRequest.count({ where: { companyId, status: "REJECTED" } }),
      prisma.product.count({
        where: {
          companyId,
          quantity: { lte: 5 },
        },
      }),
      prisma.payment.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
    ])

    // Generate chart data for the last 6 months
    const chartData = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

      const monthOrders = await prisma.orderRequest.count({
        where: {
          companyId,
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      })

      const monthRevenue = await prisma.payment.aggregate({
        where: {
          companyId,
          paymentDate: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: { amount: true },
      })

      const monthExpenses = await prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: { amount: true },
      })

      chartData.push({
        name: date.toLocaleDateString("en-US", { month: "short" }),
        orders: monthOrders,
        revenue: Number(monthRevenue._sum.amount || 0),
        expenses: Number(monthExpenses._sum.amount || 0),
      })
    }

    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      totalRevenue: Number(payments._sum.amount || 0),
      totalExpenses: Number(expenses._sum.amount || 0),
      lowStockProducts,
    }

    return NextResponse.json({ stats, chartData })
  } catch (error) {
    console.error("Error fetching director dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
