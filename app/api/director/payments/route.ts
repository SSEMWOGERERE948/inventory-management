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

    const payments = await prisma.payment.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    })

    // Convert Decimal to number for JSON serialization
    const paymentsWithNumbers = payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      creditAmount: Number(payment.creditAmount),
    }))

    return NextResponse.json(paymentsWithNumbers)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
