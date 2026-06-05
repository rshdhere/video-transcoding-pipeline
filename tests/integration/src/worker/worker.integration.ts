import { beforeAll, describe, test } from "vitest";

import { createAuthenticatedSession } from "../helpers/auth.ts";

describe("worker tests", () => {
  let token: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
  });

  test("only logged-in user's are allowed to use transcoding-worker", async () => {
    void token;
  });

  test("un-authorized user's should not be able able to use transcoding-worker", async () => {});

  test("un-authenticated user should be able to use emai-verfication-worker", async () => {});

  test("un-authenticated user should not be able to use transcoding-worker", async () => {});

  test("worker's should gracefully shut-down on massive data exchange", async () => {});

  test("immediate-fallback if any worker was shutdown", async () => {});

  test("long-polling should not over-whelm the workers", async () => {});

  test("batch-delete on every sucessfull message", async () => {});
});
