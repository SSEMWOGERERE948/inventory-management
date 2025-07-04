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

    const products = await prisma.product.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
            customerOrders: true,
          },
        },
        stockAlerts: {
          where: {
            isResolved: false,
          },
          select: {
            id: true,
            alertType: true,
            message: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Add calculated fields
    const productsWithAnalytics = products.map((product) => ({
      ...product,
      totalSales: product._count.orderItems + product._count.customerOrders,
      stockStatus:
        product.quantity <= 0 ? "OUT_OF_STOCK" : product.quantity <= product.minStock ? "LOW_STOCK" : "IN_STOCK",
      hasActiveAlerts: product.stockAlerts.length > 0,
    }))

    return NextResponse.json(productsWithAnalytics)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, sku, price, quantity, minStock, maxStock, categoryId } = body

    // Validate required fields
    if (!name || !sku || price === undefined || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    })

    if (existingSku) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        price: Number.parseFloat(price),
        quantity: Number.parseInt(quantity),
        minStock: Number.parseInt(minStock) || 10,
        maxStock: maxStock ? Number.parseInt(maxStock) : null,
        companyId: session.user.companyId,
        categoryId: categoryId || null,
        createdById: session.user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create stock alert if quantity is below minimum
    if (Number.parseInt(quantity) <= Number.parseInt(minStock || 10)) {
      await prisma.stockAlert.create({
        data: {
          productId: product.id,
          companyId: session.user.companyId,
          alertType: Number.parseInt(quantity) === 0 ? "CRITICAL" : "HIGH",
          message:
            Number.parseInt(quantity) === 0
              ? `${product.name} is out of stock!`
              : `${product.name} is below minimum stock level (${quantity} remaining)`,
        },
      })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
