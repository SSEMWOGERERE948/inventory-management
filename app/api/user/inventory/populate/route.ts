import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔄 Manual inventory population triggered for user:", session.user.id)

    // Get all users in the same company
    const companyUsers = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    console.log(`👥 Found ${companyUsers.length} users in company`)

    // Get ALL shipped orders for the company
    const shippedOrders = await prisma.orderRequest.findMany({
      where: {
        user: {
          companyId: session.user.companyId,
        },
        status: "SHIPPED",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log(`📦 Found ${shippedOrders.length} shipped orders in company`)

    // Create a comprehensive inventory map for all products that have been shipped
    const allShippedProducts = new Map()

    for (const order of shippedOrders) {
      for (const item of order.items) {
        const key = item.productId

        if (allShippedProducts.has(key)) {
          const existing = allShippedProducts.get(key)
          allShippedProducts.set(key, {
            ...existing,
            totalQuantityShipped: existing.totalQuantityShipped + item.quantity,
            orders: [...existing.orders, { orderId: order.id, userId: order.userId, quantity: item.quantity }],
          })
        } else {
          allShippedProducts.set(key, {
            productId: item.productId,
            product: item.product,
            totalQuantityShipped: item.quantity,
            orders: [{ orderId: order.id, userId: order.userId, quantity: item.quantity }],
          })
        }
      }
    }

    console.log(`📊 Found ${allShippedProducts.size} unique products shipped in company`)

    // Now populate inventory for ALL users in the company
    const populationResults = []

    for (const user of companyUsers) {
      console.log(`👤 Populating inventory for user: ${user.name} (${user.id})`)

      const userInventoryOperations = []

      // Convert Map entries to array to avoid iteration issues
      const productEntries = Array.from(allShippedProducts.entries())

      for (const [productId, productInfo] of productEntries) {
        // Calculate quantities for this specific user
        const userOrders = productInfo.orders.filter((order: any) => order.userId === user.id)
        const userQuantityReceived = userOrders.reduce((sum: number, order: any) => sum + order.quantity, 0)

        // Create inventory record
        userInventoryOperations.push(
          prisma.userInventory.upsert({
            where: {
              userId_productId: {
                userId: user.id,
                productId: productId,
              },
            },
            update: {
              quantityReceived: userQuantityReceived,
              quantityAvailable: userQuantityReceived, // Assuming no usage initially
              lastUpdated: new Date(),
            },
            create: {
              userId: user.id,
              productId: productId,
              quantityReceived: userQuantityReceived,
              quantityUsed: 0,
              quantityAvailable: userQuantityReceived,
              lastUpdated: new Date(),
            },
          }),
        )
      }

      if (userInventoryOperations.length > 0) {
        await prisma.$transaction(userInventoryOperations)
        populationResults.push({
          userId: user.id,
          userName: user.name,
          productsPopulated: userInventoryOperations.length,
        })
      }
    }

    console.log("✅ Inventory population completed for all users")

    return NextResponse.json({
      success: true,
      message: "Inventory populated successfully for all company users",
      results: {
        totalUsers: companyUsers.length,
        totalShippedOrders: shippedOrders.length,
        totalUniqueProducts: allShippedProducts.size,
        userResults: populationResults,
      },
    })
  } catch (error) {
    console.error("❌ Error in manual inventory population:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
