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

    // Get the purpose from query params to determine what products to return
    const { searchParams } = new URL(request.url)
    const purpose = searchParams.get("purpose") // 'inventory' or 'ordering'

    console.log("🔍 Fetching products for user:", session.user.id, "Purpose:", purpose)

    // If purpose is 'ordering', return all company products for order creation
    if (purpose === "ordering") {
      console.log("📦 Fetching all company products for ordering")

      const products = await prisma.product.findMany({
        where: {
          companyId: session.user.companyId,
          isActive: true,
        },
        include: {
          category: true,
        },
      })

      console.log(`📦 Found ${products.length} company products for ordering`)

      return NextResponse.json(
        products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          price: Number(product.price),
          isActive: product.isActive,
          category: product.category,
        })),
      )
    }

    // For regular users, fetch products from their inventory
    if (session.user.role === "USER") {
      console.log("👤 Processing inventory for regular user")

      // First, let's populate inventory from ALL shipped orders for this company
      await populateUserInventoryFromShippedOrders(session.user.id, session.user.companyId)

      // Now fetch the user's current inventory
      const userInventory = await prisma.userInventory.findMany({
        where: {
          userId: session.user.id,
          quantityAvailable: { gt: 0 }, // Only show products with available quantity
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      console.log(`📦 Found ${userInventory.length} products in user inventory after population`)

      if (userInventory.length > 0) {
        const products = userInventory.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          sku: item.product.sku,
          price: Number(item.product.price),
          quantity: item.quantityAvailable,
          quantityReceived: item.quantityReceived,
          quantityUsed: item.quantityUsed,
          isActive: item.product.isActive,
          category: item.product.category,
        }))

        return NextResponse.json(products)
      } else {
        // If still no inventory, return empty array
        console.log("⚠️ No inventory found even after population")
        return NextResponse.json([])
      }
    } else {
      // For directors and admins, fetch all products
      console.log("👑 Fetching all products for admin/director")

      const products = await prisma.product.findMany({
        where: {
          companyId: session.user.companyId,
          isActive: true,
        },
        include: {
          category: true,
        },
      })

      return NextResponse.json(
        products.map((product) => ({
          ...product,
          price: Number(product.price),
        })),
      )
    }
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to populate user inventory from all shipped orders in the company
async function populateUserInventoryFromShippedOrders(userId: string, companyId: string) {
  try {
    console.log("🔄 Starting inventory population for user:", userId, "company:", companyId)

    // Get ALL shipped orders for the company (not just for this user)
    const shippedOrders = await prisma.orderRequest.findMany({
      where: {
        // Get orders from users in the same company
        user: {
          companyId: companyId,
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
        user: true, // Include user info to see which orders belong to our user
      },
    })

    console.log(`📦 Found ${shippedOrders.length} shipped orders in company`)

    if (shippedOrders.length === 0) {
      console.log("⚠️ No shipped orders found in company")
      return
    }

    // Separate orders: user's own orders vs company orders
    const userOrders = shippedOrders.filter((order) => order.userId === userId)
    const companyOrders = shippedOrders.filter((order) => order.userId !== userId)

    console.log(`📦 User's own orders: ${userOrders.length}, Company orders: ${companyOrders.length}`)

    // Create inventory map for user's own orders (full quantity)
    const inventoryMap = new Map()

    // Process user's own orders - they get the full quantity
    for (const order of userOrders) {
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
            source: "own_order",
          })
        }
      }
    }

    // Process company orders - user gets access to these products but with 0 initial quantity
    // This ensures they can see all company products in their inventory list
    for (const order of companyOrders) {
      for (const item of order.items) {
        const key = item.productId

        if (!inventoryMap.has(key)) {
          // Only add if not already present from user's own orders
          inventoryMap.set(key, {
            productId: item.productId,
            product: item.product,
            quantityReceived: 0, // They didn't receive this directly
            quantityUsed: 0,
            quantityAvailable: 0, // No available quantity initially
            source: "company_catalog",
          })
        }
      }
    }

    console.log(`📦 Created ${inventoryMap.size} inventory records from shipped orders`)

    if (inventoryMap.size === 0) {
      console.log("⚠️ No inventory items to create")
      return
    }

    // Create/update inventory records in database
    const inventoryOperations = Array.from(inventoryMap.values()).map((item) =>
      prisma.userInventory.upsert({
        where: {
          userId_productId: {
            userId: userId,
            productId: item.productId,
          },
        },
        update: {
          // Only update if this is from user's own orders
          ...(item.source === "own_order" && {
            quantityReceived: { increment: item.quantityReceived },
            quantityAvailable: { increment: item.quantityAvailable },
          }),
          lastUpdated: new Date(),
        },
        create: {
          userId: userId,
          productId: item.productId,
          quantityReceived: item.quantityReceived,
          quantityUsed: 0,
          quantityAvailable: item.quantityReceived, // Will be 0 for company catalog items
          lastUpdated: new Date(),
        },
      }),
    )

    await prisma.$transaction(inventoryOperations)

    console.log(`✅ Successfully populated inventory with ${inventoryMap.size} products`)
  } catch (error) {
    console.error("❌ Error populating user inventory:", error)
    throw error
  }
}
