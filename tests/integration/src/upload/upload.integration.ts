import { beforeAll, describe, test } from "vitest";

import { createAuthenticatedSession } from "../helpers/auth.ts";
import { ALLOWED_UPLOAD_MIME_TYPES, UPLOAD_COOLDOWN_SECONDS } from "../schema.ts";

describe("upload tests", () => {
  let token: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
  });

  test("only logged-in user's are able to upload to S3", async () => {
    void token;
  });

  test("un-authorized users should not be able to upload to S3", async () => {});

  test("un-authenticated users should not be able to upload to S3", async () => {});

  test(`only ${ALLOWED_UPLOAD_MIME_TYPES.map((type) => type.replace("video/", "")).join(" & ")} file-types are allowed to be uploaded to S3`, async () => {});

  test(`only one video can be uploaded in the span of ${UPLOAD_COOLDOWN_SECONDS}-secs`, async () => {});

  test("concurrent video uploads should fail before overwhelming the infra at the application-level", async () => {});

  test("upload should have proper rate-limiting to over-come any DDoS", async () => {});

  test("user's are only allowed to exchange valid and type-safe schema", async () => {});
});
