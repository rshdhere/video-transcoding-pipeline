"use client"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  if (isPending || !session) return null

  return (
    <div>
      <p>Hi, {session.user.name}!!</p>
      <Button variant={'destructive'} onClick={handleLogout}>Logout</Button>
    </div>
  )
}
