const { execSync } = require("child_process")

console.log("🚀 Setting up deployment...")

try {
  // Generate Prisma client
  console.log("📦 Generating Prisma client...")
  execSync("npx prisma generate", { stdio: "inherit" })

  // Push database schema
  console.log("🗄️ Pushing database schema...")
  execSync("npx prisma db push", { stdio: "inherit" })

  // Seed database
  console.log("🌱 Seeding database...")
  execSync("npm run db:seed", { stdio: "inherit" })

  console.log("✅ Deployment setup completed!")
} catch (error) {
  console.error("❌ Deployment setup failed:", error.message)
  process.exit(1)
}
