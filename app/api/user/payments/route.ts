import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount, description, receiptUrl, paymentDate } = await request.json()

    if (!amount || !description || !paymentDate) {
      return NextResponse.json({ error: "Amount, description, and payment date are required" }, { status: 400 })
    }

    const paymentAmount = Number.parseFloat(amount)

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 })
    }

    // Get user's company ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: "User not associated with a company" }, { status: 400 })
    }

    const payment = await prisma.payment.create({
      data: {
        amount: paymentAmount,
        description,
        receiptUrl,
        paymentDate: new Date(paymentDate),
        userId: session.user.id,
        companyId: user.companyId,
        isFromCredit: false,
        creditAmount: 0,
      },
    })

    return NextResponse.json({
      ...payment,
      amount: Number(payment.amount),
      creditAmount: Number(payment.creditAmount),
    })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
