import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "COMPANY_DIRECTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: "Director not associated with a company" }, { status: 400 })
    }

    const { quantity, notes } = await request.json()

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 })
    }

    // Verify product exists and belongs to company
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Start transaction to update stock and create restock record
    const result = await prisma.$transaction(async (tx) => {
      // Update product quantity
      const updatedProduct = await tx.product.update({
        where: { id: params.id },
        data: {
          quantity: {
            increment: Number(quantity),
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

      // Create restock record
      const restockRecord = await tx.restockRecord.create({
        data: {
          productId: params.id,
          companyId: session.user.companyId,
          userId: session.user.id,
          quantity: Number(quantity),
          notes: notes || null,
        },
      })

      // Resolve any active stock alerts for this product
      await tx.stockAlert.updateMany({
        where: {
          productId: params.id,
          companyId: session.user.companyId,
          isResolved: false,
        },
        data: {
          isResolved: true,
        },
      })

      return { updatedProduct, restockRecord }
    })

    return NextResponse.json({
      product: {
        ...result.updatedProduct,
        price: Number(result.updatedProduct.price),
      },
      restockRecord: result.restockRecord,
      message: "Product restocked successfully",
    })
  } catch (error) {
    console.error("Error restocking product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
