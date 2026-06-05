import { beforeAll, describe, test } from "vitest";

import { createAuthenticatedSession } from "../helpers/auth.ts";
import { MAX_DAILY_DOWNLOADS, TRANSCODING_RESOLUTIONS } from "../schema.ts";

describe("download tests", () => {
  let token: string;

  beforeAll(async () => {
    const session = await createAuthenticatedSession();
    token = session.token;
  });

  test("only logged-in users are able to download transcoded video's", async () => {
    void token;
  });

  test("un-authorized users should not be able to download the transcoded video's", async () => {});

  test("un-authenticated users should not be able to download the transcoded video's", async () => {});

  test("downloads should have proper rate-limiting on the count of downloads over some threshold", async () => {});

  test(`a user can download max of ${MAX_DAILY_DOWNLOADS} diffrent transcoded video's a day`, async () => {});

  test("concurrent download request should not download the same video twice-thrice", async () => {});

  test(`resulted-transcoded video's should be of the types ${TRANSCODING_RESOLUTIONS.join("-")} only`, async () => {});

  test(`resulted-transcoded video's should all be available to download in ${TRANSCODING_RESOLUTIONS.join("-")}`, async () => {});
});
