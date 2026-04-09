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
  let html = await fs.promises.readFile(templatePath, "utf-8")

  html = html.replaceAll("{{VERIFICATION_URL}}", verificationUrl)

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_ADDRESS,
    to: userEmail,
    subject: 'verify your email',
    html: html,
  })
  console.log(`[resend]: email has been sent to id-${data?.id}`)

  if (error) {
    console.error(`[resend-error]: email was not send coz of ${error?.name} which returned ${error?.message}`)
  }
}
