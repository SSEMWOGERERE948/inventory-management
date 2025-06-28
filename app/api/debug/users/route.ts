import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 Debug: Checking database connection...")

    // Test database connection
    await prisma.$connect()
    console.log("✅ Database connected")

    // Check if users exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        password: true, // We'll check if password exists
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`✅ Found ${users.length} users`)

    // Test password hashing for each user
    const userTests = await Promise.all(
      users.map(async (user: { password: string; email: any; name: any; role: any; isActive: any; company: { name: any } }) => {
        const hasPassword = !!user.password
        let passwordTest = false

        if (user.password) {
          try {
            passwordTest = await bcrypt.compare("password123", user.password)
          } catch (error) {
            console.error(`❌ Password test failed for ${user.email}:`, error)
          }
        }

        return {
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          hasPassword,
          passwordTest,
          company: user.company?.name || "No company",
        }
      }),
    )

    return NextResponse.json({
      status: "success",
      databaseConnected: true,
      userCount: users.length,
      users: userTests,
    })
  } catch (error) {
    console.error("❌ Debug error:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
