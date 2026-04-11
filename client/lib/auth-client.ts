import { BACKEND_URL } from "@/config"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: BACKEND_URL
})
