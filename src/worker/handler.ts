import { sendMail } from "@/email/index.js"

export const handlers: Record<string, (body: any) => Promise<void>> = {
  VERIFY_EMAIL: async (body) => {
    await sendMail({
      userEmail: body.userEmail,
      verificationUrl: body.verificationUrl,
    })
  },
}


