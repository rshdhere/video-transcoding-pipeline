import { createApp } from "@vtp/api-v1";
import request from "supertest";

import { testConfig } from "../setup.ts";

const { app } = createApp(testConfig);
const origin = testConfig.BETTER_AUTH_URL;

export type TestAgent = ReturnType<typeof request.agent>;

export function uniqueEmail() {
  return `rshd-${Math.random()}@example.com`;
}

export async function createAuthenticatedSession(
  email = uniqueEmail(),
  password = "password1234",
) {
  const agent = request.agent(app);

  await agent
    .post("/api/v1/auth/sign-up/email")
    .set("Origin", origin)
    .send({
      name: "Test User",
      email,
      password,
    });

  const signInResponse = await agent
    .post("/api/v1/auth/sign-in/email")
    .set("Origin", origin)
    .send({
      email,
      password,
    });

  return {
    agent,
    email,
    password,
    token: signInResponse.body.token as string,
  };
}

export async function createSecondAuthenticatedSession() {
  return createAuthenticatedSession();
}

export { app, origin };
