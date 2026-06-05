import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import type {
  JobQueueMessage,
  ReceivedQueueMessage,
  SqsClientConfig,
} from "./types.ts";

export function createSqsClient(config: SqsClientConfig) {
  return new SQSClient({
    region: config.region,
    endpoint: config.endpoint,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
  });
}

export async function sendJobMessage(
  client: SQSClient,
  queueUrl: string,
  message: JobQueueMessage,
) {
  const response = await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    }),
  );

  if (!response.MessageId) {
    throw new Error("SQS SendMessage did not return a MessageId");
  }

  return { messageId: response.MessageId };
}

export async function receiveJobMessage(
  client: SQSClient,
  queueUrl: string,
  waitTimeSeconds = 0,
): Promise<ReceivedQueueMessage | null> {
  const response = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: 900,
    }),
  );

  const [message] = response.Messages ?? [];

  if (!message?.Body || !message.ReceiptHandle || !message.MessageId) {
    return null;
  }

  return {
    messageId: message.MessageId,
    receiptHandle: message.ReceiptHandle,
    body: JSON.parse(message.Body) as JobQueueMessage,
  };
}

export async function deleteJobMessage(
  client: SQSClient,
  queueUrl: string,
  receiptHandle: string,
) {
  await client.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
}

export async function releaseJobMessage(
  client: SQSClient,
  queueUrl: string,
  receiptHandle: string,
) {
  await client.send(
    new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: 0,
    }),
  );
}
