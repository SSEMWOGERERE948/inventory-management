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

    // Get all users in the company with their credit information
    const users = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        creditLimit: true,
        creditUsed: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    // Get credit transactions for the company
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Last 50 transactions
    })

    // Convert Decimal to number for JSON serialization
    const usersWithNumbers = users.map((user) => ({
      ...user,
      creditLimit: Number(user.creditLimit),
      creditUsed: Number(user.creditUsed),
    }))

    const transactionsWithNumbers = creditTransactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
    }))

    return NextResponse.json({
      users: usersWithNumbers,
      transactions: transactionsWithNumbers,
    })
  } catch (error) {
    console.error("Error fetching credit data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, creditLimit, description } = await request.json()

    if (!userId || creditLimit === undefined) {
      return NextResponse.json({ error: "User ID and credit limit are required" }, { status: 400 })
    }

    // Validate the user belongs to the same company
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: session.user.companyId,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const creditLimitNumber = Number.parseFloat(creditLimit)

    // Update user's credit limit
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { creditLimit: creditLimitNumber },
    })

    // Create credit transaction record using Prisma create method
    await prisma.creditTransaction.create({
      data: {
        userId,
        companyId: session.user.companyId,
        type: "GRANTED",
        amount: creditLimitNumber,
        description: description || `Credit limit set to UGX ${creditLimitNumber.toLocaleString()}`,
      },
    })

    return NextResponse.json({
      ...updatedUser,
      creditLimit: Number(updatedUser.creditLimit),
      creditUsed: Number(updatedUser.creditUsed),
    })
  } catch (error) {
    console.error("Error updating credit limit:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
