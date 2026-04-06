import "dotenv/config"
import { EMAIL_QUEUE_URL } from "@/config/config.js"
import { sendMail } from "@/email/index.js"
import { emailQueueClient } from "@/queue/index.js"
import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs"


async function poll() {
  const res = await emailQueueClient.send(
    new ReceiveMessageCommand({
      QueueUrl: EMAIL_QUEUE_URL,
      WaitTimeSeconds: 20,
    })
  )

  if (!res.Messages) return

  for (const msg of res.Messages) {
    const body = JSON.parse(msg.Body!)

    try {
      if (body.type === "VERIFY_EMAIL") {
        await sendMail({
          userEmail: body.userEmail,
          verificationUrl: body.verificationUrl,
        })
      }

      await emailQueueClient.send(
        new DeleteMessageCommand({
          QueueUrl: EMAIL_QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle!,
        })
      )
    } catch (err) {
      console.error(err)
    }
  }
}

setInterval(poll, 5000)
