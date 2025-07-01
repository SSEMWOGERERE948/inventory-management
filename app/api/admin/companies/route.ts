import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companies = await prisma.company.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error("Error fetching companies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { companyName, companyEmail, companyPhone, companyAddress, directorName, directorEmail, directorPassword } =
      body

    // Check if company email already exists
    const existingCompany = await prisma.company.findFirst({
      where: { email: companyEmail },
    })

    if (existingCompany) {
      return NextResponse.json({ error: "Company email already exists" }, { status: 400 })
    }

    // Check if director email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: directorEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Director email already exists" }, { status: 400 })
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        address: companyAddress,
      },
    })

    // Create company director
    const hashedPassword = await bcrypt.hash(directorPassword, 12)

    const director = await prisma.user.create({
      data: {
        name: directorName,
        email: directorEmail,
        password: hashedPassword,
        role: "COMPANY_DIRECTOR",
        companyId: company.id,
      },
    })

    return NextResponse.json({
      company,
      director: {
        id: director.id,
        name: director.name,
        email: director.email,
        role: director.role,
      },
    })
  } catch (error) {
    console.error("Error creating company:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
