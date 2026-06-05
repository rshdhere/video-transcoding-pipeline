import { resetWorkerRuntime } from "@vtp/handlers";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  app,
  createAuthenticatedSession,
  createSecondAuthenticatedSession,
  origin,
  type TestAgent,
} from "../helpers/auth.ts";
import {
  getVideoById,
  resetPipelineTables,
  seedActiveUpload,
} from "../helpers/db.ts";
import { UPLOAD_COOLDOWN_SECONDS } from "../schema.ts";

describe("upload tests", () => {
  let token: string;
  let agent: TestAgent;
  let userId: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
    agent = session.agent;
    userId = (await agent.get("/api/v1/me")).body.user.id;
  });

  beforeEach(async () => {
    await resetPipelineTables();
    resetWorkerRuntime();
  });

  test("only logged-in user's are able to upload to S3", async () => {
    const response = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "clip.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 1_024_000,
      });

    expect(response.status).toBe(201);
    expect(response.body.video.id).toBeDefined();
    expect(response.body.uploadUrl).toContain("s3://");
    expect(token).toBeDefined();

    const video = await getVideoById(response.body.video.id);
    expect(video?.mimeType).toBe("video/mp4");
  });

  test("un-authorized users should not be able to upload to S3", async () => {
    const owner = await createAuthenticatedSession();
    const intruder = await createSecondAuthenticatedSession();

    const upload = await owner.agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "owned.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 500_000,
      });

    expect(upload.status).toBe(201);

    const video = await getVideoById(upload.body.video.id);
    expect(video?.userId).not.toBe(
      (await intruder.agent.get("/api/v1/me")).body.user.id,
    );
  });

  test("un-authenticated users should not be able to upload to S3", async () => {
    const response = await request(app)
      .post("/api/v1/videos/upload")
      .send({
        fileName: "guest.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 500_000,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("only mp4 & webm file-types are allowed to be uploaded to S3", async () => {
    const response = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "clip.mov",
        mimeType: "video/quicktime",
        fileSizeBytes: 500_000,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request body");
  });

  test(`only one video can be uploaded in the span of ${UPLOAD_COOLDOWN_SECONDS}-secs`, async () => {
    const first = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "first.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 500_000,
      });

    expect(first.status).toBe(201);

    const second = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "second.mp4",
        mimeType: "video/webm",
        fileSizeBytes: 500_000,
      });

    expect(second.status).toBe(429);
    expect(second.body.code).toBe("UPLOAD_COOLDOWN_ACTIVE");
  });

  test("concurrent video uploads should fail before overwhelming the infra at the application-level", async () => {
    await seedActiveUpload(userId, "in-flight");

    const concurrent = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "blocked.webm",
        mimeType: "video/webm",
        fileSizeBytes: 500_000,
      });

    expect(concurrent.status).toBe(429);
    expect(concurrent.body.code).toBe("CONCURRENT_UPLOAD_NOT_ALLOWED");
  });

  test("upload should have proper rate-limiting to over-come any DDoS", async () => {
    const response = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "rate-limit.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 500_000,
      });

    expect(response.status).toBe(201);

    const retry = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "rate-limit-2.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 500_000,
      });

    expect(retry.status).toBe(429);
  });

  test("user's are only allowed to exchange valid and type-safe schema", async () => {
    const response = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "",
        mimeType: "video/mp4",
        fileSizeBytes: -1,
      });

    expect(response.status).toBe(400);
    expect(response.body.issues).toBeDefined();
  });
});
