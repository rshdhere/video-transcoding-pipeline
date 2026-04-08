import { SendMessageCommand } from "@aws-sdk/client-sqs"
import { QueueClient } from "./client.js"
import { QUEUE_URL } from "@/config/config.js"

type Job = {
  type: "VERIFY_EMAIL",
  userEmail: string,
  verificationUrl: string
}

export async function enqueueEmailJob(job: Job) {
  await QueueClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(job),
    })
  )
}
