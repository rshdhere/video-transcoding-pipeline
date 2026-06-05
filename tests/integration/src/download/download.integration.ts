import { resetAwsClients, resetWorkerRuntime } from "@vtp/handlers";
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
  countDownloadsForUser,
  getVariantsForVideo,
  resetPipelineTables,
  seedReadyVideo,
} from "../helpers/db.ts";
import { MAX_DAILY_DOWNLOADS, TRANSCODING_RESOLUTIONS } from "../schema.ts";

async function uploadAndTranscode(agent: TestAgent) {
  const upload = await agent
    .post("/api/v1/videos/upload")
    .set("Origin", origin)
    .send({
      fileName: "download-target.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 2_000_000,
    });

  expect(upload.status).toBe(201);

  const process = await agent
    .post("/api/v1/workers/process")
    .set("Origin", origin)
    .send({ type: "transcoding" });

  expect(process.status).toBe(200);
  expect(process.body.processed).toBe(true);

  return upload.body.video.id as string;
}

describe("download tests", () => {
  let token: string;
  let agent: TestAgent;
  let userId: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
    agent = session.agent;

    const me = await agent.get("/api/v1/me");
    userId = me.body.user.id;
  });

  beforeEach(async () => {
    await resetPipelineTables();
    resetAwsClients();
    resetWorkerRuntime();
  });

  test("only logged-in users are able to download transcoded video's", async () => {
    const videoId = await uploadAndTranscode(agent);

    const response = await agent
      .post(`/api/v1/videos/${videoId}/download`)
      .set("Origin", origin)
      .send({ resolution: "720p" });

    expect(response.status).toBe(200);
    expect(response.body.downloadUrl).toContain("https://");
    expect(token).toBeDefined();
  });

  test("un-authorized users should not be able to download the transcoded video's", async () => {
    const owner = await createAuthenticatedSession();
    const intruder = await createSecondAuthenticatedSession();
    const videoId = await uploadAndTranscode(owner.agent);

    const response = await intruder.agent
      .post(`/api/v1/videos/${videoId}/download`)
      .set("Origin", origin)
      .send({ resolution: "480p" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  test("un-authenticated users should not be able to download the transcoded video's", async () => {
    const videoId = await uploadAndTranscode(agent);

    const response = await request(app)
      .post(`/api/v1/videos/${videoId}/download`)
      .send({ resolution: "1080p" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  test("downloads should have proper rate-limiting on the count of downloads over some threshold", async () => {
    const videoId = await uploadAndTranscode(agent);
    const idempotencyKey = `burst-${crypto.randomUUID()}`;

    const first = await agent
      .post(`/api/v1/videos/${videoId}/download`)
      .set("Origin", origin)
      .send({ resolution: "480p", idempotencyKey });

    expect(first.status).toBe(200);

    const duplicate = await agent
      .post(`/api/v1/videos/${videoId}/download`)
      .set("Origin", origin)
      .send({ resolution: "480p", idempotencyKey });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.deduplicated).toBe(true);
    expect(await countDownloadsForUser(userId)).toBe(1);
  });

  test(`a user can download max of ${MAX_DAILY_DOWNLOADS} diffrent transcoded video's a day`, async () => {
    const videoIds: string[] = [];

    for (let index = 0; index < MAX_DAILY_DOWNLOADS; index += 1) {
      videoIds.push(await seedReadyVideo(userId, `daily-${index}`));
    }

    for (const videoId of videoIds) {
      const response = await agent
        .post(`/api/v1/videos/${videoId}/download`)
        .set("Origin", origin)
        .send({ resolution: "720p" });

      expect(response.status).toBe(200);
    }

    const extraVideoId = await seedReadyVideo(userId, "daily-extra");
    const blocked = await agent
      .post(`/api/v1/videos/${extraVideoId}/download`)
      .set("Origin", origin)
      .send({ resolution: "480p" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("DAILY_DOWNLOAD_LIMIT_REACHED");
  });

  test("concurrent download request should not download the same video twice-thrice", async () => {
    const videoId = await uploadAndTranscode(agent);
    const idempotencyKey = `concurrent-${crypto.randomUUID()}`;

    const [first, second, third] = await Promise.all([
      agent
        .post(`/api/v1/videos/${videoId}/download`)
        .set("Origin", origin)
        .send({ resolution: "1080p", idempotencyKey }),
      agent
        .post(`/api/v1/videos/${videoId}/download`)
        .set("Origin", origin)
        .send({ resolution: "1080p", idempotencyKey }),
      agent
        .post(`/api/v1/videos/${videoId}/download`)
        .set("Origin", origin)
        .send({ resolution: "1080p", idempotencyKey }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(await countDownloadsForUser(userId)).toBe(1);
  });

  test(`resulted-transcoded video's should be of the types ${TRANSCODING_RESOLUTIONS.join("-")} only`, async () => {
    const videoId = await uploadAndTranscode(agent);
    const variants = await getVariantsForVideo(videoId);
    const resolutions = variants.map((variant) => variant.resolution).sort();

    expect(resolutions).toEqual([...TRANSCODING_RESOLUTIONS].sort());
    expect(
      variants.every((variant) =>
        TRANSCODING_RESOLUTIONS.includes(variant.resolution),
      ),
    ).toBe(true);
  });

  test(`resulted-transcoded video's should all be available to download in ${TRANSCODING_RESOLUTIONS.join("-")}`, async () => {
    const videoId = await uploadAndTranscode(agent);

    for (const resolution of TRANSCODING_RESOLUTIONS) {
      const response = await agent
        .post(`/api/v1/videos/${videoId}/download`)
        .set("Origin", origin)
        .send({ resolution });

      expect(response.status).toBe(200);
      expect(response.body.variant.resolution).toBe(resolution);
    }
  });
});
