import { QueueClient } from "./client.js";
import { QUEUE_URL } from "@/config/config.js";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

export const queueWarmup = async () => {
  console.time('queue warmp-up sucessfull in')
  await QueueClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ type: "WARMUP" }),
    })
  )
  console.timeEnd('queue warmp-up sucessfull in')
};
