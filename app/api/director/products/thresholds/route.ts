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
    const { productId, minThreshold, maxThreshold } = body

    if (!productId || minThreshold === undefined) {
      return NextResponse.json({ error: "Product ID and minimum threshold are required" }, { status: 400 })
    }

    if (minThreshold < 0 || (maxThreshold && maxThreshold <= minThreshold)) {
      return NextResponse.json({ error: "Invalid threshold values" }, { status: 400 })
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

    // Update product thresholds
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        minStock: Number.parseInt(minThreshold),
        maxStock: maxThreshold ? Number.parseInt(maxThreshold) : null,
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
      message: "Thresholds updated successfully",
      product: updatedProduct,
    })
  } catch (error) {
    console.error("Error updating thresholds:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
