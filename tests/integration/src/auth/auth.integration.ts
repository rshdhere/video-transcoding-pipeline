import request from "supertest";
import { describe, expect, test } from "vitest";

import { app, origin, uniqueEmail } from "../helpers/auth.ts";

describe("Authentication", () => {
  test("user should be able to sign-up only once", async () => {
    const email = uniqueEmail();
    const password = "password1234";

    const response = await request(app)
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    expect(response.status).toBe(200);

    const updatedResponse = await request(app)
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    expect(updatedResponse.status).toBe(422);
    expect(updatedResponse.body.code).toBe(
      "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    );
  });

  test("sign-up request fails if the email is empty", async () => {
    const response = await request(app)
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        password: "password1234",
      });

    expect(response.status).toBe(400);
  });

  test("sign-in succeeds if the email and password are correct", async () => {
    const email = uniqueEmail();
    const password = "password1234";

    await request(app)
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    const response = await request(app)
      .post("/api/v1/auth/sign-in/email")
      .set("Origin", origin)
      .send({
        email,
        password,
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(email);
  });

  test("sign-in fails if the email and password are incorrect", async () => {
    const email = uniqueEmail();
    const password = "password1234";

    await request(app)
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    const response = await request(app)
      .post("/api/v1/auth/sign-in/email")
      .set("Origin", origin)
      .send({
        email: "wrong@example.com",
        password,
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });
});

describe("Protected user endpoints", () => {
  test("user can access /api/v1/me with a valid session", async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const password = "password1234";

    await agent
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    await agent
      .post("/api/v1/auth/sign-in/email")
      .set("Origin", origin)
      .send({
        email,
        password,
      });

    const response = await agent.get("/api/v1/me");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
    expect(response.body.session.id).toBeDefined();
  });

  test("user cannot access /api/v1/me without a session", async () => {
    const response = await request(app).get("/api/v1/me");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });
});

describe("Session lifecycle", () => {
  test("user can sign out and lose their session", async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    const password = "password1234";

    await agent
      .post("/api/v1/auth/sign-up/email")
      .set("Origin", origin)
      .send({
        name: "Test User",
        email,
        password,
      });

    await agent
      .post("/api/v1/auth/sign-in/email")
      .set("Origin", origin)
      .send({
        email,
        password,
      });

    const sessionBeforeSignOut = await agent.get("/api/v1/auth/get-session");
    expect(sessionBeforeSignOut.body.session).toBeDefined();

    const signOutResponse = await agent
      .post("/api/v1/auth/sign-out")
      .set("Origin", origin);

    expect(signOutResponse.status).toBe(200);
    expect(signOutResponse.body.success).toBe(true);

    const sessionAfterSignOut = await agent.get("/api/v1/auth/get-session");
    expect(sessionAfterSignOut.body).toBeNull();

    const meResponse = await agent.get("/api/v1/me");
    expect(meResponse.status).toBe(401);
  });
});
