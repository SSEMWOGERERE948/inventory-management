import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 Fetching inventory for user:", session.user.id)

    // Get user inventory
    const userInventory = await prisma.userInventory.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    })

    console.log(`📦 Found ${userInventory.length} inventory items`)

    // If no inventory found, check if user has any shipped orders
    if (userInventory.length === 0) {
      console.log("⚠️ No inventory found, checking for shipped orders")

      const shippedOrders = await prisma.orderRequest.findMany({
        where: {
          userId: session.user.id,
          status: "SHIPPED",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      console.log(`📦 Found ${shippedOrders.length} shipped orders`)

      if (shippedOrders.length > 0) {
        // Create inventory records from shipped orders
        const inventoryMap = new Map()

        // Collect all items from shipped orders
        for (const order of shippedOrders) {
          for (const item of order.items) {
            const key = item.productId
            if (inventoryMap.has(key)) {
              const existing = inventoryMap.get(key)
              inventoryMap.set(key, {
                ...existing,
                quantityReceived: existing.quantityReceived + item.quantity,
                quantityAvailable: existing.quantityAvailable + item.quantity,
              })
            } else {
              inventoryMap.set(key, {
                productId: item.productId,
                product: item.product,
                quantityReceived: item.quantity,
                quantityUsed: 0,
                quantityAvailable: item.quantity,
              })
            }
          }
        }

        console.log(`📦 Creating ${inventoryMap.size} inventory records from shipped orders`)

        // Create inventory records in database
        await prisma.$transaction(
          Array.from(inventoryMap.values()).map((item) =>
            prisma.userInventory.create({
              data: {
                userId: session.user.id,
                productId: item.productId,
                quantityReceived: item.quantityReceived,
                quantityUsed: 0,
                quantityAvailable: item.quantityReceived,
                lastUpdated: new Date(),
              },
            }),
          ),
        )

        // Fetch the newly created inventory
        const newInventory = await prisma.userInventory.findMany({
          where: {
            userId: session.user.id,
          },
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        })

        console.log(`📦 Created ${newInventory.length} inventory records`)

        return NextResponse.json(
          newInventory.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            price: Number(item.product.price),
            quantityReceived: item.quantityReceived,
            quantityUsed: item.quantityUsed,
            quantityAvailable: item.quantityAvailable,
            category: item.product.category?.name || "Uncategorized",
            lastUpdated: item.lastUpdated,
          })),
        )
      }

      // If no shipped orders, return empty array
      return NextResponse.json([])
    }

    // Return inventory with product details
    return NextResponse.json(
      userInventory.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        price: Number(item.product.price),
        quantityReceived: item.quantityReceived,
        quantityUsed: item.quantityUsed,
        quantityAvailable: item.quantityAvailable,
        category: item.product.category?.name || "Uncategorized",
        lastUpdated: item.lastUpdated,
      })),
    )
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
