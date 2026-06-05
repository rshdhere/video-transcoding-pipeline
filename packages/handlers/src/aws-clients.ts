import {
  createDownloadPresignedUrl,
  createS3Client,
  createUploadPresignedUrl,
} from "@vtp/aws";
import type { Config } from "@vtp/config";
import {
  createSqsClient,
  deleteJobMessage,
  receiveJobMessage,
  releaseJobMessage,
  sendJobMessage,
  type JobQueueMessage,
} from "@vtp/queue";

type S3Client = ReturnType<typeof createS3Client>;
type SqsClient = ReturnType<typeof createSqsClient>;

let s3Client: S3Client | undefined;
let sqsClient: SqsClient | undefined;

export function getS3Client(config: Config) {
  if (!s3Client) {
    s3Client = createS3Client({
      region: config.AWS_REGION,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
    });
  }

  return s3Client;
}

export function getSqsClient(config: Config) {
  if (!sqsClient) {
    sqsClient = createSqsClient({
      region: config.AWS_REGION,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      endpoint: config.SQS_ENDPOINT,
    });
  }

  return sqsClient;
}

export function getQueueUrl(
  config: Config,
  type: JobQueueMessage["type"],
) {
  if (type === "transcoding") {
    return config.SQS_TRANSCODING_QUEUE_URL;
  }

  return config.SQS_EMAIL_VERIFICATION_QUEUE_URL;
}

export async function resolveUploadUrl(
  config: Config,
  bucket: string,
  key: string,
  contentType: string,
) {
  if (!config.AWS_ENABLED) {
    return `s3://${bucket}/${key}`;
  }

  return createUploadPresignedUrl(
    getS3Client(config),
    bucket,
    key,
    contentType,
    config.UPLOAD_PRESIGNED_URL_EXPIRES_SECONDS,
  );
}

export async function resolveDownloadUrl(
  config: Config,
  bucket: string,
  key: string,
) {
  if (!config.AWS_ENABLED) {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  return createDownloadPresignedUrl(
    getS3Client(config),
    bucket,
    key,
    config.DOWNLOAD_PRESIGNED_URL_EXPIRES_SECONDS,
  );
}

export async function enqueueSqsJob(
  config: Config,
  message: JobQueueMessage,
) {
  const queueUrl = getQueueUrl(config, message.type);

  if (!queueUrl) {
    throw new Error(`Queue URL is not configured for ${message.type}`);
  }

  return sendJobMessage(getSqsClient(config), queueUrl, message);
}

export async function dequeueSqsJob(
  config: Config,
  type: JobQueueMessage["type"],
) {
  const queueUrl = getQueueUrl(config, type);

  if (!queueUrl) {
    return null;
  }

  return receiveJobMessage(getSqsClient(config), queueUrl);
}

export async function ackSqsJob(
  config: Config,
  type: JobQueueMessage["type"],
  receiptHandle: string,
) {
  const queueUrl = getQueueUrl(config, type);

  if (!queueUrl) {
    return;
  }

  await deleteJobMessage(getSqsClient(config), queueUrl, receiptHandle);
}

export async function nackSqsJob(
  config: Config,
  type: JobQueueMessage["type"],
  receiptHandle: string,
) {
  const queueUrl = getQueueUrl(config, type);

  if (!queueUrl) {
    return;
  }

  await releaseJobMessage(getSqsClient(config), queueUrl, receiptHandle);
}

export function resetAwsClients() {
  s3Client = undefined;
  sqsClient = undefined;
}
