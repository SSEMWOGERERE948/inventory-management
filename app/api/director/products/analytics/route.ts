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

    if (!session.user.companyId) {
      return NextResponse.json({ error: "Director not associated with a company" }, { status: 400 })
    }

    // Get product sales analytics
    const productSales = await prisma.orderRequestItem.groupBy({
      by: ["productId"],
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      where: {
        orderRequest: {
          companyId: session.user.companyId,
          status: {
            in: ["APPROVED", "SHIPPED", "DELIVERED"],
          },
        },
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
    })

    // Get product details for the analytics
    const productIds = productSales.map((sale) => sale.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        quantity: true,
      },
    })

    // Combine sales data with product details
    const analytics = productSales.map((sale) => {
      const product = products.find((p) => p.id === sale.productId)
      const totalQuantity = Number(sale._sum.quantity || 0)
      const totalRevenue = Number(sale._sum.totalPrice || 0)
      const totalOrders = sale._count.id || 0

      return {
        productId: sale.productId,
        productName: product?.name || "Unknown Product",
        productSku: product?.sku || "N/A",
        currentStock: product?.quantity || 0,
        totalQuantitySold: totalQuantity,
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        averageOrderSize: totalOrders > 0 ? totalQuantity / totalOrders : 0,
      }
    })

    // Get customer order analytics (from credit sales)
    const customerOrderSales = await prisma.customerOrder.groupBy({
      by: ["productId"],
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      where: {
        customer: {
          user: {
            companyId: session.user.companyId,
          },
        },
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
    })

    // Get all products for customer analytics
    const customerProductIds = customerOrderSales.map((sale) => sale.productId)
    const customerProducts = await prisma.product.findMany({
      where: {
        id: { in: customerProductIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        quantity: true,
      },
    })

    // Combine customer order data
    const customerAnalytics = customerOrderSales.map((sale) => {
      const product = customerProducts.find((p) => p.id === sale.productId)
      const totalQuantity = Number(sale._sum.quantity || 0)
      const totalRevenue = Number(sale._sum.totalAmount || 0)
      const totalOrders = sale._count.id || 0

      return {
        productId: sale.productId,
        productName: product?.name || "Unknown Product",
        productSku: product?.sku || "N/A",
        totalQuantitySold: totalQuantity,
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
      }
    })

    // Calculate summary totals
    const regularOrdersRevenue = analytics.reduce((sum, item) => sum + item.totalRevenue, 0)
    const customerOrdersRevenue = customerAnalytics.reduce((sum, item) => sum + item.totalRevenue, 0)
    const regularOrdersQuantity = analytics.reduce((sum, item) => sum + item.totalQuantitySold, 0)
    const customerOrdersQuantity = customerAnalytics.reduce((sum, item) => sum + item.totalQuantitySold, 0)

    // Get all products count
    const allProductsCount = await prisma.product.count({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
    })

    return NextResponse.json({
      regularOrders: analytics,
      creditSales: customerAnalytics,
      summary: {
        totalProducts: allProductsCount,
        totalRevenue: regularOrdersRevenue + customerOrdersRevenue,
        totalQuantitySold: regularOrdersQuantity + customerOrdersQuantity,
      },
    })
  } catch (error) {
    console.error("Error fetching product analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
