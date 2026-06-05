export type JobQueueMessage = {
  jobId: string;
  type: "transcoding" | "email_verification";
  userId?: string;
  videoId?: string;
  payload: Record<string, unknown>;
};

export type ReceivedQueueMessage = {
  messageId: string;
  receiptHandle: string;
  body: JobQueueMessage;
};

export type SqsClientConfig = {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
};
