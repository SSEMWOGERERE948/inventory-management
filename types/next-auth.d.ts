import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      companyId: string
      companyName: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    companyName: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    companyId: string
    companyName: string
  }
}
