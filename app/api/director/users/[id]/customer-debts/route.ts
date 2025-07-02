import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: "Director not associated with a company" }, { status: 400 })
    }

    // Verify the user belongs to the same company
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
        role: { not: "COMPANY_DIRECTOR" },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all customers with outstanding balances for this user
    const customers = await prisma.customer.findMany({
      where: {
        userId: params.id,
        outstandingBalance: {
          gt: 0,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        totalCredit: true,
        totalPaid: true,
        outstandingBalance: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            payments: true,
          },
        },
      },
      orderBy: {
        outstandingBalance: "desc", // Highest debt first
      },
    })

    // Convert Decimal to number for JSON serialization
    const customersWithNumbers = customers.map((customer) => ({
      ...customer,
      totalCredit: Number(customer.totalCredit),
      totalPaid: Number(customer.totalPaid),
      outstandingBalance: Number(customer.outstandingBalance),
    }))

    // Calculate totals
    const totals = {
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, c) => sum + Number(c.outstandingBalance), 0),
      totalCredit: customers.reduce((sum, c) => sum + Number(c.totalCredit), 0),
      totalPaid: customers.reduce((sum, c) => sum + Number(c.totalPaid), 0),
    }

    return NextResponse.json({
      user,
      customers: customersWithNumbers,
      totals,
    })
  } catch (error) {
    console.error("Error fetching customer debts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
