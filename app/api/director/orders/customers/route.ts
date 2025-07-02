import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customers = await prisma.customer.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        orders: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            orders: true,
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Convert Decimal fields to numbers
    const customersWithNumbers = customers.map((customer) => ({
      ...customer,
      totalCredit: Number(customer.totalCredit),
      totalPaid: Number(customer.totalPaid),
      outstandingBalance: Number(customer.outstandingBalance),
      orders: customer.orders.map((order) => ({
        ...order,
        unitPrice: Number(order.unitPrice),
        totalAmount: Number(order.totalAmount),
        paidAmount: Number(order.paidAmount),
        remainingAmount: Number(order.remainingAmount),
      })),
      payments: customer.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    }))

    return NextResponse.json(customersWithNumbers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, phone, email, address } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        userId: session.user.id,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({
      ...customer,
      totalCredit: Number(customer.totalCredit),
      totalPaid: Number(customer.totalPaid),
      outstandingBalance: Number(customer.outstandingBalance),
    })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
