const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seeding...")

  try {
    // Create companies
    const company1 = await prisma.company.upsert({
      where: { name: "TechCorp Solutions" },
      update: {},
      create: {
        name: "TechCorp Solutions",
        description: "Technology solutions company",
      },
    })

    const company2 = await prisma.company.upsert({
      where: { name: "Global Enterprises" },
      update: {},
      create: {
        name: "Global Enterprises",
        description: "Global business solutions",
      },
    })

    console.log("✅ Companies created")

    // Create categories
    const categories = [
      { name: "Electronics", description: "Electronic devices and components" },
      { name: "Office Supplies", description: "Office equipment and supplies" },
      { name: "Software", description: "Software licenses and tools" },
      { name: "Hardware", description: "Computer hardware and accessories" },
    ]

    for (const categoryData of categories) {
      await prisma.category.upsert({
        where: { name: categoryData.name },
        update: {},
        create: {
          ...categoryData,
          companyId: company1.id,
        },
      })
    }

    console.log("✅ Categories created")

    // Create users
    const hashedPassword = await bcrypt.hash("password123", 12)

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@demo.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@demo.com",
        password: hashedPassword,
        role: "ADMIN",
        companyId: company1.id,
      },
    })

    const directorUser = await prisma.user.upsert({
      where: { email: "director@demo.com" },
      update: {},
      create: {
        name: "Director User",
        email: "director@demo.com",
        password: hashedPassword,
        role: "COMPANY_DIRECTOR",
        companyId: company1.id,
      },
    })

    const regularUser = await prisma.user.upsert({
      where: { email: "user@demo.com" },
      update: {},
      create: {
        name: "Regular User",
        email: "user@demo.com",
        password: hashedPassword,
        role: "USER",
        companyId: company1.id,
      },
    })

    console.log("✅ Users created")

    // Get categories for products
    const electronicsCategory = await prisma.category.findFirst({
      where: { name: "Electronics" },
    })

    const officeCategory = await prisma.category.findFirst({
      where: { name: "Office Supplies" },
    })

    // Create products
    const products = [
      {
        name: "Laptop Dell XPS 13",
        description: "High-performance laptop for business use",
        sku: "DELL-XPS-13-001",
        price: 1299.99,
        quantity: 25,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        categoryId: electronicsCategory?.id,
        companyId: company1.id,
        createdById: adminUser.id,
      },
      {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        sku: "MOUSE-WL-001",
        price: 29.99,
        quantity: 100,
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 30,
        categoryId: electronicsCategory?.id,
        companyId: company1.id,
        createdById: adminUser.id,
      },
      {
        name: "Office Chair",
        description: "Ergonomic office chair with lumbar support",
        sku: "CHAIR-ERG-001",
        price: 299.99,
        quantity: 15,
        minStockLevel: 3,
        maxStockLevel: 30,
        reorderPoint: 5,
        categoryId: officeCategory?.id,
        companyId: company1.id,
        createdById: adminUser.id,
      },
      {
        name: "Printer Paper A4",
        description: "High-quality A4 printer paper (500 sheets)",
        sku: "PAPER-A4-500",
        price: 12.99,
        quantity: 200,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 75,
        categoryId: officeCategory?.id,
        companyId: company1.id,
        createdById: adminUser.id,
      },
    ]

    for (const productData of products) {
      await prisma.product.upsert({
        where: { sku: productData.sku },
        update: {},
        create: productData,
      })
    }

    console.log("✅ Products created")

    // Create sample orders
    const laptop = await prisma.product.findFirst({ where: { sku: "DELL-XPS-13-001" } })
    const mouse = await prisma.product.findFirst({ where: { sku: "MOUSE-WL-001" } })

    if (laptop && mouse) {
      const order = await prisma.orderRequest.create({
        data: {
          userId: regularUser.id,
          companyId: company1.id,
          status: "PENDING",
          totalAmount: 1359.97, // 1299.99 + 59.98
          notes: "Urgent order for new employee setup",
          items: {
            create: [
              {
                productId: laptop.id,
                quantity: 1,
                unitPrice: laptop.price,
                totalPrice: laptop.price,
              },
              {
                productId: mouse.id,
                quantity: 2,
                unitPrice: mouse.price,
                totalPrice: mouse.price * 2,
              },
            ],
          },
        },
      })

      console.log("✅ Sample orders created")
    }

    // Create sample payments
    await prisma.payment.create({
      data: {
        userId: regularUser.id,
        companyId: company1.id,
        amount: 150.0,
        description: "Office supplies purchase",
        paymentDate: new Date(),
      },
    })

    // Create sample expenses
    await prisma.expense.create({
      data: {
        userId: regularUser.id,
        companyId: company1.id,
        amount: 75.5,
        description: "Business lunch with client",
        category: "Meals & Entertainment",
        expenseDate: new Date(),
      },
    })

    console.log("✅ Sample payments and expenses created")

    console.log("🎉 Database seeding completed successfully!")
    console.log("\n📋 Demo Accounts:")
    console.log("Admin: admin@demo.com / password123")
    console.log("Director: director@demo.com / password123")
    console.log("User: user@demo.com / password123")
  } catch (error) {
    console.error("❌ Error during seeding:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
