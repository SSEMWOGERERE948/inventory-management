"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const urlError = searchParams.get("error")

  // Show error from URL params
  useEffect(() => {
    if (urlError) {
      setError("Authentication failed. Please try again.")
    }
  }, [urlError])

  // Check if user is already signed in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push("/dashboard")
      }
    }
    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("🔐 Attempting sign in with:", email)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      console.log("🔍 Sign in result:", result)

      if (result?.error) {
        console.error("❌ Sign in error:", result.error)
        setError("Invalid email or password")
        toast.error("Invalid credentials")
      } else if (result?.ok) {
        console.log("✅ Sign in successful")
        toast.success("Signed in successfully")

        // Small delay to ensure session is established
        setTimeout(async () => {
          const session = await getSession()
          console.log("📋 Session after sign in:", session)

          if (session?.user?.role === "ADMIN") {
            window.location.href = "/admin"
          } else if (session?.user?.role === "COMPANY_DIRECTOR") {
            window.location.href = "/director"
          } else {
            window.location.href = "/dashboard"
          }
        }, 100)
      }
    } catch (error) {
      console.error("❌ Sign in error:", error)
      setError("An error occurred during sign in")
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)

    // Trigger the form submission
    const event = new Event("submit", { bubbles: true, cancelable: true })
    const form = document.querySelector("form")
    if (form) {
      Object.defineProperty(event, "target", { value: form })
      await handleSubmit(event as any)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your Inventory Pro account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          {/* <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium text-sm text-foreground mb-3">Demo Credentials:</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs bg-transparent"
                onClick={() => handleDemoLogin("admin@inventory.com", "password123")}
                disabled={isLoading}
              >
                <strong>Admin:</strong>&nbsp;admin@inventory.com / password123
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs bg-transparent"
                onClick={() => handleDemoLogin("director@techcorp.com", "password123")}
                disabled={isLoading}
              >
                <strong>Director:</strong>&nbsp;director@techcorp.com / password123
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs bg-transparent"
                onClick={() => handleDemoLogin("user1@techcorp.com", "password123")}
                disabled={isLoading}
              >
                <strong>User:</strong>&nbsp;user1@techcorp.com / password123
              </Button>
            </div>
          </div> */}

          {/* <div className="mt-4 text-center">
            <Link href="/api/debug/users" className="text-xs text-muted-foreground hover:text-primary underline">
              Debug: Check Users
            </Link>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}
