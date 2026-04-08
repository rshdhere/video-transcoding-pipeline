import "dotenv/config"
import pLimit from "p-limit"
import { QUEUE_URL } from "@/config/config.js"
import { QueueClient } from "@/queue/client.js"
import {
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
} from "@aws-sdk/client-sqs"
import { handlers } from "./handler.js"

const limit = pLimit(5)

async function poll(): Promise<void> {
  try {
    const res = await QueueClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      })
    )

    if (res.Messages?.length) {
      const deleteEntries: { Id: string; ReceiptHandle: string }[] = []

      await Promise.all(
        res.Messages.map((msg, index) =>
          limit(async () => {
            try {
              const body = JSON.parse(msg.Body!)

              const handler = handlers[body.type]
              if (!handler) {
                console.warn("unknown message type:", body.type)
                return
              }

              await handler(body)

              deleteEntries.push({
                Id: msg.MessageId || index.toString(),
                ReceiptHandle: msg.ReceiptHandle!,
              })
            } catch (err) {
              console.error("message processing failed:", err)
            }
          })
        )
      )

      // batch delete successful messages
      if (deleteEntries.length > 0) {
        await QueueClient.send(
          new DeleteMessageBatchCommand({
            QueueUrl: QUEUE_URL,
            Entries: deleteEntries,
          })
        )
      }
    }
  } catch (err) {
    console.error("polling failed:", err)
  }

  // immediately continue polling (long polling already handles wait)
  poll()
}

// start worker
poll()
