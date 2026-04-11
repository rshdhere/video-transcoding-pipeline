"use client"

import { SignupForm } from "@/components/signup-form"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SignupPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    // Only redirect if they didn't just sign up
    if (session && !emailSent) router.push("/dashboard")
  }, [session, emailSent, router])

  if (isPending) return null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignupForm emailSent={emailSent} setEmailSent={setEmailSent} />
      </div>
    </div>
  )
}
