import { AWS_REGION, EMAIL_AWS_ACCESS_KEY, EMAIL_AWS_SECRET_ACCESS_KEY } from "@/config/config.js";
import { SQSClient } from "@aws-sdk/client-sqs";

export const emailQueueClient = new SQSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: EMAIL_AWS_ACCESS_KEY,
    secretAccessKey: EMAIL_AWS_SECRET_ACCESS_KEY,
  }
});


