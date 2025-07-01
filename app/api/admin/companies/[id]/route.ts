import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, address } = body

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        address,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
            orderRequests: true,
          },
        },
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error("Error updating company:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.company.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Company deleted successfully" })
  } catch (error) {
    console.error("Error deleting company:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
