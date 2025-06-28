"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"

const errorMessages = {
  CredentialsSignin: "Invalid email or password. Please check your credentials and try again.",
  EmailSignin: "Unable to send email. Please try again later.",
  OAuthSignin: "Error occurred during OAuth sign in.",
  OAuthCallback: "Error occurred during OAuth callback.",
  OAuthCreateAccount: "Could not create OAuth account.",
  EmailCreateAccount: "Could not create email account.",
  Callback: "Error occurred during callback.",
  OAuthAccountNotLinked: "OAuth account is not linked to any user.",
  SessionRequired: "Please sign in to access this page.",
  default: "An unexpected error occurred. Please try again.",
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") as keyof typeof errorMessages
  const provider = searchParams.get("provider")

  const errorMessage = errorMessages[error] || errorMessages.default

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-destructive/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>There was a problem signing you in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          {error === "CredentialsSignin" && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm text-foreground mb-2">Debug Information:</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Error: {error}</p>
                {provider && <p>Provider: {provider}</p>}
                <p>
                  Try visiting{" "}
                  <Link href="/api/debug/users" className="text-primary underline">
                    /api/debug/users
                  </Link>{" "}
                  to check if users exist
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link href="/auth/signin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
