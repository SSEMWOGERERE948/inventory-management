import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Hash password once for reuse (using password123 to match your sign-in page)
  const hashedPassword = await bcrypt.hash("password123", 12)

  try {
    // Create companies first
    const techCorp = await prisma.company.upsert({
      where: { name: "TechCorp Solutions" },
      update: {},
      create: {
        name: "TechCorp Solutions",
        email: "contact@techcorp.com",
        phone: "+1-555-0123",
        address: "123 Tech Street, Silicon Valley, CA 94000",
      },
    })

    const globalIndustries = await prisma.company.upsert({
      where: { name: "Global Industries" },
      update: {},
      create: {
        name: "Global Industries",
        email: "info@globalind.com",
        phone: "+1-555-0456",
        address: "456 Business Ave, New York, NY 10001",
      },
    })

    console.log("✅ Companies created")

    // Create admin user (matches your sign-in page)
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@inventory.com" },
      update: {},
      create: {
        email: "admin@inventory.com",
        name: "System Administrator",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
        companyId: techCorp.id,
      },
    })

    // Create company director (matches your sign-in page)
    const techDirector = await prisma.user.upsert({
      where: { email: "director@techcorp.com" },
      update: {},
      create: {
        email: "director@techcorp.com",
        name: "John Director",
        password: hashedPassword,
        role: "COMPANY_DIRECTOR",
        isActive: true,
        companyId: techCorp.id,
      },
    })

    // Create regular user (matches your sign-in page)
    await prisma.user.upsert({
      where: { email: "user1@techcorp.com" },
      update: {},
      create: {
        email: "user1@techcorp.com",
        name: "Alice User",
        password: hashedPassword,
        role: "USER",
        isActive: true,
        companyId: techCorp.id,
      },
    })

    // Create additional users for Global Industries
    const globalDirector = await prisma.user.upsert({
      where: { email: "director@globalind.com" },
      update: {},
      create: {
        email: "director@globalind.com",
        name: "Jane Director",
        password: hashedPassword,
        role: "COMPANY_DIRECTOR",
        isActive: true,
        companyId: globalIndustries.id,
      },
    })

    await prisma.user.upsert({
      where: { email: "user2@globalind.com" },
      update: {},
      create: {
        email: "user2@globalind.com",
        name: "Bob User",
        password: hashedPassword,
        role: "USER",
        isActive: true,
        companyId: globalIndustries.id,
      },
    })

    console.log("✅ Users created")

    // Create some sample products
    await prisma.product.create({
      data: {
        name: "Laptop Dell XPS 13",
        description: "High-performance ultrabook for business use",
        sku: "DELL-XPS13-001",
        quantity: 25,
        minStock: 5,
        price: 1299.99,
        companyId: techCorp.id,
        createdById: adminUser.id, // Add this line
      },
    })

    await prisma.product.create({
      data: {
        name: "Wireless Mouse",
        description: "Bluetooth wireless mouse",
        sku: "MOUSE-BT-001",
        quantity: 100,
        minStock: 20,
        price: 49.99,
        companyId: techCorp.id,
        createdById: adminUser.id, // Add this line
      },
    })

    await prisma.product.create({
      data: {
        name: "Office Chair Ergonomic",
        description: "Comfortable ergonomic office chair",
        sku: "CHAIR-ERG-001",
        quantity: 15,
        minStock: 3,
        price: 299.99,
        companyId: globalIndustries.id,
        createdById: globalDirector.id, // Add this line
      },
    })

    console.log("✅ Products created")

    console.log("🎉 Database seeded successfully!")
    console.log("\n📋 Test Accounts (password: password123):")
    console.log("Admin: admin@inventory.com")
    console.log("Director 1: director@techcorp.com")
    console.log("Director 2: director@globalind.com")
    console.log("User 1: user1@techcorp.com")
    console.log("User 2: user2@globalind.com")
  } catch (error) {
    console.error("❌ Seed error:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
