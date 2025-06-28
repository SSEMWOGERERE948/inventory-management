const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function migrateOrders() {
  try {
    console.log("🔄 Starting SQL Server order migration...")

    // First, let's check if the new fields exist by trying to update a record
    const orders = await prisma.orderRequest.findMany({
      take: 1,
    })

    if (orders.length > 0) {
      console.log("✅ Database schema appears to be up to date")
      console.log("📊 Current order count:", await prisma.orderRequest.count())

      // Try to access the new timestamp fields
      const sampleOrder = await prisma.orderRequest.findFirst({
        select: {
          id: true,
          status: true,
          approvedAt: true,
          rejectedAt: true,
          fulfilledAt: true,
          shippedAt: true,
        },
      })

      if (sampleOrder) {
        console.log("✅ Timestamp fields are available:", {
          approvedAt: sampleOrder.approvedAt,
          rejectedAt: sampleOrder.rejectedAt,
          fulfilledAt: sampleOrder.fulfilledAt,
          shippedAt: sampleOrder.shippedAt,
        })
      }
    } else {
      console.log("📝 No orders found in database")
    }

    console.log("✅ Migration check completed")
  } catch (error) {
    console.error("❌ Migration error:", error)

    if (error.message.includes("Invalid column name") || error.message.includes("Unknown arg")) {
      console.log("🔧 SQL Server schema needs to be updated!")
      console.log("🔧 Please run: npx prisma db push")
      console.log("🔧 Then run: npx prisma generate")
    }
  } finally {
    await prisma.$disconnect()
  }
}

migrateOrders()
