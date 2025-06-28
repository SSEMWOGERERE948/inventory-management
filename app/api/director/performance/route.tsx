import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subMonths, format } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "6months"

    const monthsBack = period === "3months" ? 3 : period === "12months" ? 12 : 6
    const startDate = subMonths(new Date(), monthsBack)
    const companyId = session.user.companyId

    // Get user performance data
    const users = await prisma.user.findMany({
      where: { companyId },
      include: {
        orderRequests: {
          where: { createdAt: { gte: startDate } },
        },
        payments: {
          where: { paymentDate: { gte: startDate } },
        },
        expenses: {
          where: { expenseDate: { gte: startDate } },
        },
      },
    })

    const userPerformance = users.map((user) => {
      const totalOrders = user.orderRequests.length
      const totalPayments = user.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const totalExpenses = user.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const avgOrderValue =
        totalOrders > 0 ? user.orderRequests.reduce((sum, o) => sum + Number(o.totalAmount), 0) / totalOrders : 0

      const lastActivity = Math.max(
        ...user.orderRequests.map((o) => new Date(o.createdAt).getTime()),
        ...user.payments.map((p) => new Date(p.createdAt).getTime()),
        ...user.expenses.map((e) => new Date(e.createdAt).getTime()),
        new Date(user.createdAt).getTime(),
      )

      return {
        userId: user.id,
        userName: user.name || "Unknown",
        userEmail: user.email,
        totalOrders,
        totalPayments,
        totalExpenses,
        avgOrderValue,
        lastActivity: new Date(lastActivity).toISOString(),
      }
    })

    // Generate monthly trends
    const monthlyTrends = []
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = subMonths(new Date(), i)
      const monthEnd = subMonths(new Date(), i - 1)

      const [monthOrders, monthPayments, monthExpenses] = await Promise.all([
        prisma.orderRequest.count({
          where: {
            companyId,
            createdAt: { gte: monthStart, lt: monthEnd },
          },
        }),
        prisma.payment.aggregate({
          where: {
            companyId,
            paymentDate: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            companyId,
            expenseDate: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        }),
      ])

      monthlyTrends.push({
        month: format(monthStart, "MMM yyyy"),
        orders: monthOrders,
        payments: Number(monthPayments._sum.amount || 0),
        expenses: Number(monthExpenses._sum.amount || 0),
        users: users.length,
      })
    }

    // Get category breakdown
    const expensesByCategory = await prisma.expense.groupBy({
      by: ["category"],
      where: {
        companyId,
        expenseDate: { gte: startDate },
      },
      _sum: { amount: true },
      _count: { id: true },
    })

    const categoryBreakdown = expensesByCategory.map((item) => ({
      category: item.category || "Uncategorized",
      amount: Number(item._sum.amount || 0),
      count: item._count.id,
    }))

    // Calculate KPIs
    const [totalPayments, totalExpenses, totalOrders, approvedOrders] = await Promise.all([
      prisma.payment.aggregate({
        where: { companyId, paymentDate: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { companyId, expenseDate: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.orderRequest.count({
        where: { companyId, createdAt: { gte: startDate } },
      }),
      prisma.orderRequest.count({
        where: { companyId, createdAt: { gte: startDate }, status: "APPROVED" },
      }),
    ])

    const totalRevenue = Number(totalPayments._sum.amount || 0)
    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0)
    const netProfit = totalRevenue - totalExpensesAmount
    const activeUsers = users.filter(
      (u) => u.orderRequests.length > 0 || u.payments.length > 0 || u.expenses.length > 0,
    ).length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const orderFulfillmentRate = totalOrders > 0 ? approvedOrders / totalOrders : 0

    const kpis = {
      totalRevenue,
      totalExpenses: totalExpensesAmount,
      netProfit,
      activeUsers,
      avgOrderValue,
      orderFulfillmentRate,
    }

    return NextResponse.json({
      userPerformance,
      monthlyTrends,
      categoryBreakdown,
      kpis,
    })
  } catch (error) {
    console.error("Error fetching performance data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
