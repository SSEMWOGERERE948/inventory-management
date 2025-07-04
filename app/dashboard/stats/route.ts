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
      // Get user's inventory data
      const userInventory = await prisma.userInventory.findMany({
        where: { userId: session.user.id },
        include: {
          product: true,
        },
      })

      // Get user's customers
      const userCustomers = await prisma.customer.findMany({
        where: { userId: session.user.id },
      })

      // Calculate current month revenue
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = await prisma.payment.aggregate({
        where: {
          userId: session.user.id,
          paymentDate: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1),
          },
        },
        _sum: {
          amount: true,
        },
      })

      // Calculate inventory stats
      const totalProducts = userInventory.length
      const productsInStock = userInventory.filter((item) => item.quantityAvailable > 0).length
      const outOfStockProducts = userInventory.filter((item) => item.quantityAvailable === 0).length
      const lowStockProducts = userInventory.filter(
        (item) => item.quantityAvailable > 0 && item.quantityAvailable <= 5,
      ).length
      const totalQuantityAvailable = userInventory.reduce((sum, item) => sum + item.quantityAvailable, 0)
      const inventoryValue = userInventory.reduce(
        (sum, item) => sum + item.quantityAvailable * Number(item.product.price),
        0,
      )

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
        // Inventory data
        inventory: {
          totalProducts,
          productsInStock,
          outOfStockProducts,
          lowStockProducts,
          totalQuantityAvailable,
          inventoryValue,
        },
        // Customer data
        customers: {
          totalCustomers: userCustomers.length,
        },
        // Monthly revenue
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
      })
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
