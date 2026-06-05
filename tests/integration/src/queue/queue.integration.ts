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
import { db, resetPipelineTables } from "../helpers/db.ts";

describe("queue tests", () => {
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
    resetAwsClients();
    resetWorkerRuntime();
  });

  test("only logged-in user's are able to push background-jobs to queue", async () => {
    const response = await agent
      .post("/api/v1/queue/push")
      .set("Origin", origin)
      .send({
        type: "transcoding",
        payload: { source: "integration-test" },
      });

    expect(response.status).toBe(201);
    expect(response.body.job.type).toBe("transcoding");
    expect(response.body.job.userId).toBe(userId);
    expect(token).toBeDefined();
  });

  test("un-authorized user's should not be able to push transcoding-job to the queue", async () => {
    const owner = await createAuthenticatedSession();
    const intruder = await createSecondAuthenticatedSession();

    const upload = await owner.agent
      .post("/api/v1/videos/upload")
      .set("Origin", origin)
      .send({
        fileName: "queue-owner.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 900_000,
      });

    expect(upload.status).toBe(201);

    const response = await intruder.agent
      .post("/api/v1/queue/push")
      .set("Origin", origin)
      .send({
        type: "transcoding",
        payload: { videoId: upload.body.video.id },
        videoId: upload.body.video.id,
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  test("un-authorized user's should not be able to pop transcoding-job from the queue", async () => {
    const owner = await createAuthenticatedSession();
    const intruder = await createSecondAuthenticatedSession();

    await owner.agent
      .post("/api/v1/queue/push")
      .set("Origin", origin)
      .send({
        type: "transcoding",
        payload: { source: "owner-job" },
      });

    const pop = await intruder.agent
      .post("/api/v1/queue/pop")
      .set("Origin", origin)
      .send({ type: "transcoding" });

    expect(pop.status).toBe(204);

    const ownerMe = await owner.agent.get("/api/v1/me");
    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.userId, ownerMe.body.user.id));

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("queued");
  });

  test("un-authenticated user's should not be able to push transcoding-job to the queue", async () => {
    const response = await request(app)
      .post("/api/v1/queue/push")
      .send({
        type: "transcoding",
        payload: { source: "guest" },
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("un-authenticated user should be able to push email-verification-job to the queue", async () => {
    const response = await request(app)
      .post("/api/v1/queue/push")
      .send({
        type: "email_verification",
        payload: { email: "guest@example.com" },
      });

    expect(response.status).toBe(201);
    expect(response.body.job.type).toBe("email_verification");
    expect(response.body.job.userId).toBeNull();
  });

  test("un-authenticated user's should not be able to pop transcoding-job from the queue", async () => {
    const response = await request(app)
      .post("/api/v1/queue/pop")
      .send({ type: "transcoding" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("only JSON data-format can be exchanged with SQS", async () => {
    const response = await agent
      .post("/api/v1/queue/push")
      .set("Origin", origin)
      .send({
        type: "transcoding",
        payload: ["not", "json", "object"],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request body");
  });

  test("user's should be binded with proper rate-limiting at the application-level before overwhelming the infra", async () => {
    for (let index = 0; index < 20; index += 1) {
      const response = await agent
        .post("/api/v1/queue/push")
        .set("Origin", origin)
        .send({
          type: "transcoding",
          payload: { index },
        });

      expect(response.status).toBe(201);
    }

    const blocked = await agent
      .post("/api/v1/queue/push")
      .set("Origin", origin)
      .send({
        type: "transcoding",
        payload: { index: "blocked" },
      });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("QUEUE_RATE_LIMIT_EXCEEDED");
  });
});
