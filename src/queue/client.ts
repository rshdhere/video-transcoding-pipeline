import { Agent } from "https";
import { SQSClient } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY } from "@/config/config.js";

export const QueueClient = new SQSClient({
  region: AWS_REGION,
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({
      keepAlive: true,
      keepAliveMsecs: 60_000,
      family: 4
    })
  }),
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  }
});

