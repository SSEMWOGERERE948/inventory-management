import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 Auth attempt for:", credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials")
          return null
        }

        try {
          console.log("🔍 Looking up user in database...")
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              company: true,
            },
          })

          console.log("👤 User found:", user ? "YES" : "NO")
          if (user) {
            console.log("📧 User email:", user.email)
            console.log("🏢 User role:", user.role)
            console.log("✅ User active:", user.isActive)
            console.log("🔑 Has password:", !!user.password)
          }

          if (!user || !user.password || !user.isActive) {
            console.log("❌ User validation failed")
            return null
          }

          console.log("🔐 Checking password...")
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          console.log("🔑 Password valid:", isPasswordValid)

          if (!isPasswordValid) {
            console.log("❌ Invalid password")
            return null
          }

          console.log("✅ Authentication successful!")
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            role: user.role,
            companyId: user.companyId || "",
            companyName: user.company?.name || "Unknown Company",
          }
        } catch (error) {
          console.error("💥 Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }: { token: any; user: any }) => {
      if (user) {
        console.log("🎫 Creating JWT for user:", user.email)
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.companyName = user.companyName
      }
      return token
    },
    session: async ({ session, token }: { session: any; token: any }) => {
      if (token) {
        console.log("📋 Creating session for user:", token.id)
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
      }
      return session
    },
    redirect: async ({ url, baseUrl }: { url: string; baseUrl: string }) => {
      console.log("🔄 Redirect - URL:", url, "Base:", baseUrl)
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + "/dashboard"
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true, // Enable debug mode
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
