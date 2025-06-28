const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🚀 Setting up deployment...")

// Check if we're in a git repository
try {
  execSync("git status", { stdio: "ignore" })
  console.log("✅ Git repository detected")
} catch (error) {
  console.log("📝 Initializing git repository...")
  execSync("git init")
  execSync("git add .")
  execSync('git commit -m "Initial commit"')
  console.log("✅ Git repository initialized")
}

// Check for required files
const requiredFiles = ["package.json", "next.config.js", "prisma/schema.prisma", ".env.example"]

console.log("📋 Checking required files...")
for (const file of requiredFiles) {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - Missing!`)
  }
}

// Create .gitignore if it doesn't exist
const gitignorePath = path.join(process.cwd(), ".gitignore")
if (!fs.existsSync(gitignorePath)) {
  const gitignoreContent = `
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/

# Production
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Database
*.db
*.sqlite

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`
  fs.writeFileSync(gitignorePath, gitignoreContent.trim())
  console.log("✅ .gitignore created")
}

// Create vercel.json for deployment configuration
const vercelConfigPath = path.join(process.cwd(), "vercel.json")
if (!fs.existsSync(vercelConfigPath)) {
  const vercelConfig = {
    buildCommand: "npm run vercel-build",
    functions: {
      "app/api/**/*.ts": {
        maxDuration: 30,
      },
    },
    crons: [
      {
        path: "/api/cron/stock-alerts",
        schedule: "0 9 * * *",
      },
    ],
  }
  fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2))
  console.log("✅ vercel.json created")
}

console.log("\n🎯 Deployment Setup Complete!")
console.log("\n📋 Next Steps:")
console.log("1. Create a new project on Vercel (https://vercel.com)")
console.log("2. Connect your GitHub repository")
console.log("3. Add Vercel Postgres database to your project")
console.log("4. Set environment variables in Vercel dashboard:")
console.log("   - DATABASE_URL (from Vercel Postgres)")
console.log("   - DIRECT_URL (from Vercel Postgres)")
console.log("   - NEXTAUTH_URL (your production domain)")
console.log("   - NEXTAUTH_SECRET (random 32+ character string)")
console.log("5. Deploy your application")
console.log("6. Run database setup: npm run db:push && npm run db:seed")
console.log("\n🔗 Useful commands:")
console.log("- npm run build (test build locally)")
console.log("- npm run db:push (push schema to database)")
console.log("- npm run db:seed (seed database with demo data)")
console.log("- npm run db:studio (open Prisma Studio)")
