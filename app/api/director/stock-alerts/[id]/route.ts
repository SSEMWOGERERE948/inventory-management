import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { isResolved } = body

    // Since we're generating alerts dynamically, we'll just return success
    // In a real implementation, you might want to store resolved alerts in a separate table
    // or mark products as "acknowledged" for a certain period

    return NextResponse.json({
      message: "Alert resolved successfully",
      id: params.id,
      isResolved: true,
    })
  } catch (error) {
    console.error("Error resolving stock alert:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
