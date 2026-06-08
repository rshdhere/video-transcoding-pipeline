import { backgroundJobs } from "@vtp/drizzle";
import { resetAwsClients, resetWorkerRuntime } from "@vtp/handlers";
import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  app,
  createAuthenticatedSession,
  createSecondAuthenticatedSession,
  origin,
  type TestAgent,
} from "../helpers/auth.ts";
import { db, getVariantsForVideo, resetPipelineTables } from "../helpers/db.ts";
import { TRANSCODING_RESOLUTIONS } from "../schema.ts";

describe("worker tests", () => {
  let token: string;
  let agent: TestAgent;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
    agent = session.agent;
  });

  beforeEach(async () => {
    await resetPipelineTables();
    resetAwsClients();
    resetWorkerRuntime();
  });

  async function enqueueTranscodingJob() {
    const upload = await agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "worker-target.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 1_500_000,
      });

    expect(upload.status).toBe(201);
    return upload.body.video.id as string;
  }

  test("only logged-in user's are allowed to use transcoding-worker", async () => {
    await enqueueTranscodingJob();

    const response = await agent
      .post("/api/v1/workers/process")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(true);
    expect(token).toBeDefined();
  });

  test("un-authorized user's should not be able able to use transcoding-worker", async () => {
    const owner = await createAuthenticatedSession();
    const intruder = await createSecondAuthenticatedSession();

    await owner.agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "owner-worker.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 1_000_000,
      });

    const response = await intruder.agent
      .post("/api/v1/workers/process")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(false);
  });

  test("un-authenticated user should be able to use emai-verfication-worker", async () => {
    await request(app)
      .post("/api/v1/queue/push")
      .send({
        type: "email_verification",
        payload: { email: "verify@example.com" },
      });

    const response = await request(app)
      .post("/api/v1/workers/process")
      .send({ type: "email_verification" });

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(true);
  });

  test("un-authenticated user should not be able to use transcoding-worker", async () => {
    await enqueueTranscodingJob();

    const response = await request(app)
      .post("/api/v1/workers/process")
      .send({ type: "transcoding" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("worker's should gracefully shut-down on massive data exchange", async () => {
    await agent
      .post("/api/v1/workers/shutdown")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    const response = await agent
      .post("/api/v1/workers/process")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("WORKER_SHUTDOWN");
  });

  test("immediate-fallback if any worker was shutdown", async () => {
    await agent
      .post("/api/v1/workers/shutdown")
      .set("Origin", origin)
      .send({ type: "email_verification" });

    await request(app)
      .post("/api/v1/queue/push")
      .send({
        type: "email_verification",
        payload: { email: "fallback@example.com" },
      });

    const response = await request(app)
      .post("/api/v1/workers/process")
      .send({ type: "email_verification" });

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(true);
  });

  test("long-polling should not over-whelm the workers", async () => {
    await request(app)
      .post("/api/v1/queue/push")
      .send({
        type: "email_verification",
        payload: { email: "poll-1@example.com" },
      });

    const polls = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app)
          .post("/api/v1/workers/process")
          .send({ type: "email_verification" }),
      ),
    );

    const blocked = polls.filter((response) => response.status === 503);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0]?.body.code).toBe("POLL_LIMIT_EXCEEDED");
  });

  test("batch-delete on every sucessfull message", async () => {
    const videoId = await enqueueTranscodingJob();

    const response = await agent
      .post("/api/v1/workers/process")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(true);

    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.videoId, videoId));

    expect(job?.status).toBe("completed");
    expect(job?.receiptHandle).toBeNull();
    expect(job?.completedAt).toBeDefined();

    const variants = await getVariantsForVideo(videoId);
    expect(variants).toHaveLength(TRANSCODING_RESOLUTIONS.length);
  });
});
