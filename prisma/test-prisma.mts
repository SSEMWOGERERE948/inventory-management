// test-prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✅ Prisma connected to Neon:', result)
  } catch (error) {
    console.error('❌ Prisma cannot connect to Neon:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
