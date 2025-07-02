import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, description, receiptUrl, paymentDate } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
    }

    // Get user's current credit information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditUsed: true, creditLimit: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const paymentAmount = Number.parseFloat(amount)
    const currentCreditUsed = Number(user.creditUsed) || 0
    const creditPaymentAmount = Math.min(paymentAmount, currentCreditUsed)
    const regularPaymentAmount = paymentAmount - creditPaymentAmount

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        amount: paymentAmount,
        description: description || "Credit payment",
        receiptUrl,
        paymentDate: new Date(paymentDate),
        isFromCredit: creditPaymentAmount > 0,
        creditAmount: creditPaymentAmount,
      },
    })

    // If there's credit to be paid off, reduce credit used
    if (creditPaymentAmount > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          creditUsed: {
            decrement: creditPaymentAmount,
          },
        },
      })

      // Create credit transaction record
      await prisma.$executeRaw`
        INSERT INTO "CreditTransaction" ("userId", "companyId", "type", "amount", "description", "paymentId")
        VALUES (${session.user.id}, ${session.user.companyId}, 'CREDIT_PAYMENT', ${creditPaymentAmount}, ${`Credit payment: ${description || "Payment"}`}, ${payment.id})
      `
    }

    return NextResponse.json({
      payment,
      creditPaid: creditPaymentAmount,
      regularPayment: regularPaymentAmount,
    })
  } catch (error) {
    console.error("Error processing credit payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
