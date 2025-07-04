import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { productId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["DIRECTOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const productId = params.productId

    // Verify the product belongs to the user's company
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        companyId: session.user.companyId,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch stock movements for this product
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 movements
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error("Error fetching stock movements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
