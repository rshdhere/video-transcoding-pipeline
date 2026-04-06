import { SendMessageCommand } from "@aws-sdk/client-sqs"
import { emailQueueClient } from "./index.js"
import { EMAIL_QUEUE_URL } from "@/config/config.js"

export async function enqueueEmailJob(job: any) {
  await emailQueueClient.send(
    new SendMessageCommand({
      QueueUrl: EMAIL_QUEUE_URL,
      MessageBody: JSON.stringify(job),
    })
  )
}
