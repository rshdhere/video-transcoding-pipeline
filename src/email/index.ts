import fs from "fs"
import { Resend } from "resend";
import { RESEND_API_KEY, RESEND_FROM_ADDRESS } from "@/config/config.js";

const resend = new Resend(RESEND_API_KEY)

type sendMailInput = {
  userEmail: string,
  verificationUrl: string
}

export async function sendMail({ userEmail, verificationUrl }: sendMailInput) {

  const templatePath = new URL("./email.html", import.meta.url)
  let html = fs.readFileSync(templatePath, "utf-8")

  html = html.replaceAll("{{VERIFICATION_URL}}", verificationUrl)

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_ADDRESS,
    to: userEmail,
    subject: 'verify your email',
    html: html,

  })

  console.log("RESEND DATA:", data)
  console.log("RESEND ERROR:", error?.message, error?.name, error?.statusCode)
}
