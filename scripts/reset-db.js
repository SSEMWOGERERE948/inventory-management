import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log("🗑️  Clearing database...")

  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.orderRequestItem.deleteMany()
    await prisma.orderRequest.deleteMany()
    await prisma.productAttribute.deleteMany()
    await prisma.product.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.salesPerformance.deleteMany()
    await prisma.user.deleteMany()
    await prisma.company.deleteMany()

    console.log("✅ Database cleared successfully")
  } catch (error) {
    console.error("❌ Error clearing database:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetDatabase()
