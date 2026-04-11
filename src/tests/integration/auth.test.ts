import 'dotenv/config';
import request from "supertest";
import { app } from '@/router.js';
import { describe, expect, test } from "vitest";
import { dbClient } from '@/drizzle/src/index.js';
import { user } from '@/drizzle/src/database/schema.js';
import { eq } from 'drizzle-orm';

describe('authentication', () => {
  test('user should be able to sign-up', async () => {
    const name = `roronoa${Math.random()}`
    const email = `roronoa${Math.random()}@onepiece.com`
    const password = 'Santoriyu<3'

    const response = await request(app).post('/trpc/v1.user.signup').send({
      name, email, password
    })

    expect(response.statusCode).toBe(200)
  }),
    test('sign-up fails if either name, email or password is empty', async () => {
      const name = `roronoa${Math.random()}`
      const password = 'Santoriyu<3'

      const response = await request(app).post('/trpc/v1.user.signup').send({
        name, password
      })

      expect(response.statusCode).toBe(400);
    }),
    test('login fails if the email and password are incorrect', async () => {
      const name = `roronoa${Math.random()}`
      const email = `roronoa${Math.random()}@onepiece.com`
      const password = 'Santoriyu<3'

      await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      })

      const response = await request(app).post('/trpc/v1.user.login').send({
        name, email, password: "wrongPassword$7"
      });

      expect(response.statusCode).toBe(401)
    }),
    test('login fails even if the name, email, password are correct but when the email is not verified', async () => {
      const name = `roronoa${Math.random()}`
      const email = `roronoa${Math.random()}@onepiece.com`
      const password = 'Santoriyu<3'

      await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      })

      const response = await request(app).post('/trpc/v1.user.login').send({
        name, email, password
      });

      expect(response.statusCode).toBe(403)
    }),
    test('login only succeeds after email verification', async () => {
      const name = `roronoa${Math.random()}`
      const email = `roronoa${Math.random()}@onepiece.com`
      const password = 'Santoriyu<3'

      await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      })

      await dbClient.update(user).set({
        emailVerified: true
      }).where(eq(user.email, email));

      const response = await request(app).post('/trpc/v1.user.login').send({
        name, email, password
      });

      const token = response.body.result.data.token

      expect(response.statusCode).toBe(200)
      expect(token).toBeDefined()
      console.log(token)
    }),
    test('should not break on an SQL-injection attempt', async () => {

      const name = "' OR 1=1 --"
      const email = "'; DROP TABLE users; --"
      const password = "\" OR \"\"=\""

      const response = await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      })

      expect(response.statusCode).toBe(400)
    }),
    test('should be able to handle very-large payload', async () => {
      const buggy = "mugiwara".repeat(1000);
      const name = buggy;
      const email = `${buggy}@test.com`;
      const password = buggy;

      const response = await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      });

      expect(response.statusCode).toBe(400)
    }),
    test('should not break on an XSS-injection attempt', async () => {

      const name = "<script>alert('xss')</script>";
      const email = "<SCRIPT>alert(1)</SCRIPT>";
      const password = "%3Cscript%3Ealert(1)%3C/script%3E";

      const response = await request(app).post('/trpc/v1.user.signup').send({
        name, email, password
      });

      expect(response.statusCode).toBe(400)
    })
})

