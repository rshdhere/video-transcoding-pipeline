import { beforeAll, describe, test } from "vitest";

import { createAuthenticatedSession } from "../helpers/auth.ts";

describe("queue tests", () => {
  let token: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
  });

  test("only logged-in user's are able to push background-jobs to queue", async () => {
    void token;
  });

  test("un-authorized user's should not be able to push transcoding-job to the queue", async () => {});

  test("un-authorized user's should not be able to pop transcoding-job from the queue", async () => {});

  test("un-authenticated user's should not be able to push transcoding-job to the queue", async () => {});

  test("un-authenticated user should be able to push email-verification-job to the queue", async () => {});

  test("un-authenticated user's should not be able to pop transcoding-job from the queue", async () => {});

  test("only JSON data-format can be exchanged with SQS", async () => {});

  test("user's should be binded with proper rate-limiting at the application-level before overwhelming the infra", async () => {});
});
