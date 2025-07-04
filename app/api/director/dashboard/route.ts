import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const companyId = session.user.companyId

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Get all users in the company
    const companyUsers = await prisma.user.findMany({
      where: {
        companyId: companyId,
        role: { not: "COMPANY_DIRECTOR" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        creditLimit: true,
        creditUsed: true,
      },
    })

    // Get user inventory for each user
    const userInventorySummary = await Promise.all(
      companyUsers.map(async (user) => {
        const inventory = await prisma.userInventory.findMany({
          where: { userId: user.id },
          include: {
            product: true,
          },
        })

        const totalProducts = inventory.length
        const productsInStock = inventory.filter((item) => item.quantityAvailable > 0).length
        const outOfStockProducts = inventory.filter((item) => item.quantityAvailable === 0).length
        const lowStockProducts = inventory.filter(
          (item) => item.quantityAvailable > 0 && item.quantityAvailable <= 5,
        ).length
        const totalQuantity = inventory.reduce((sum, item) => sum + item.quantityAvailable, 0)
        const inventoryValue = inventory.reduce(
          (sum, item) => sum + item.quantityAvailable * Number(item.product.price),
          0,
        )

        // Get user's recent orders
        const recentOrders = await prisma.orderRequest.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        })

        // Get user's payments this month
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const monthlyPayments = await prisma.payment.aggregate({
          where: {
            userId: user.id,
            paymentDate: {
              gte: new Date(currentYear, currentMonth, 1),
              lt: new Date(currentYear, currentMonth + 1, 1),
            },
          },
          _sum: {
            amount: true,
          },
        })

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            creditLimit: Number(user.creditLimit),
            creditUsed: Number(user.creditUsed),
            creditAvailable: Number(user.creditLimit) - Number(user.creditUsed),
          },
          inventory: {
            totalProducts,
            productsInStock,
            outOfStockProducts,
            lowStockProducts,
            totalQuantity,
            inventoryValue,
          },
          performance: {
            recentOrders,
            monthlyPayments: Number(monthlyPayments._sum.amount || 0),
          },
        }
      }),
    )

    // Get company users for stock alert query
    const companyUserIds = companyUsers.map((user) => user.id)

    // Company-wide statistics
    const [totalOrders, pendingOrders, approvedOrders, shippedOrders, totalPayments, totalExpenses] =
      await Promise.all([
        prisma.orderRequest.count({
          where: {
            user: { companyId },
          },
        }),
        prisma.orderRequest.count({
          where: {
            user: { companyId },
            status: "PENDING",
          },
        }),
        prisma.orderRequest.count({
          where: {
            user: { companyId },
            status: "APPROVED",
          },
        }),
        prisma.orderRequest.count({
          where: {
            user: { companyId },
            status: "SHIPPED",
          },
        }),
        prisma.payment.aggregate({
          where: {
            user: { companyId },
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.expense.aggregate({
          where: {
            user: { companyId },
          },
          _sum: {
            amount: true,
          },
        }),
      ])

    // Calculate company-wide inventory totals
    const companyInventoryTotals = userInventorySummary.reduce(
      (totals, userSummary) => ({
        totalProducts: totals.totalProducts + userSummary.inventory.totalProducts,
        productsInStock: totals.productsInStock + userSummary.inventory.productsInStock,
        outOfStockProducts: totals.outOfStockProducts + userSummary.inventory.outOfStockProducts,
        lowStockProducts: totals.lowStockProducts + userSummary.inventory.lowStockProducts,
        totalQuantity: totals.totalQuantity + userSummary.inventory.totalQuantity,
        inventoryValue: totals.inventoryValue + userSummary.inventory.inventoryValue,
      }),
      {
        totalProducts: 0,
        productsInStock: 0,
        outOfStockProducts: 0,
        lowStockProducts: 0,
        totalQuantity: 0,
        inventoryValue: 0,
      },
    )

    return NextResponse.json({
      companyStats: {
        totalUsers: companyUsers.length,
        totalOrders,
        pendingOrders,
        approvedOrders,
        shippedOrders,
        totalPayments: Number(totalPayments._sum.amount || 0),
        totalExpenses: Number(totalExpenses._sum.amount || 0),
      },
      companyInventory: companyInventoryTotals,
      userInventorySummary,
    })
  } catch (error) {
    console.error("Error fetching director dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
