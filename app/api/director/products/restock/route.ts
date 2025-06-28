import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Product ID and valid quantity are required" }, { status: 400 })
    }

    // Check if product exists and belongs to user's company
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        companyId: session.user.companyId,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Update product quantity by adding the restock amount
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: Number.parseInt(quantity),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: `Successfully restocked ${quantity} units`,
      product: updatedProduct,
    })
  } catch (error) {
    console.error("Error restocking product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
