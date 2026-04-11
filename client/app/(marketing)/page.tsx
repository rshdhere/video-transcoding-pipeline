"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (session) {
      router.push("/dashboard")
    }
  }, [session, router])

  if (isPending || session) return null

  return (
    <div>
      <Button variant="link">
        <Link href="/signup">Signup</Link>
      </Button>
      <Button variant="link">
        <Link href="/login">Login</Link>
      </Button>
    </div>
  )
}
