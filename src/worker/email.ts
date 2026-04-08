import "dotenv/config"
import { QUEUE_URL } from "@/config/config.js"
import { sendMail } from "@/email/index.js"
import { QueueClient } from "@/queue/client.js"
import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs"

async function poll() {
  try {
    const res = await QueueClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      })
    )

    if (res.Messages) {
      for (const msg of res.Messages) {
        const body = JSON.parse(msg.Body!)

        try {
          if (body.type === "VERIFY_EMAIL") {
            await sendMail({
              userEmail: body.userEmail,
              verificationUrl: body.verificationUrl,
            })
          }

          await QueueClient.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle!,
            })
          )
        } catch (err) {
          console.error("Message processing failed:", err)
        }
      }
    }
  } catch (err) {
    console.error("Polling failed:", err)
  }

  // small delay to avoid hammering SQS
  setTimeout(poll, 1000)
}

// start
poll()
