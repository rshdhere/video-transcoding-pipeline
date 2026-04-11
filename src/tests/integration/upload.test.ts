import "dotenv/config"
import request from "supertest"
import { eq } from "drizzle-orm"
import { app } from "@/router.js"
import { dbClient } from "@/drizzle/src/index.js"
import { user } from "@/drizzle/src/database/schema.js"
import { beforeAll, describe, expect, test } from "vitest"

describe('video-upload', () => {
  let token: string
  beforeAll(async () => {
    const name = `chopper${Math.random()}`
    const email = `chopper${Math.random()}@onepiece.com`
    const password = 'Bakachi<3'

    await request(app).post('/trpc/v1.user.signup').send({
      name, email, password
    });

    // expecting the user to verify the email, mocking it is bs
    await dbClient.update(user).set({
      emailVerified: true
    }).where(eq(user.email, email));

    const userLoginResponse = await request(app).post('/trpc/v1.user.login').send({
      name, email, password
    })

    token = userLoginResponse.body.result.data.token
  }),
    test('user is able to save the snapshot of S3 into the database', async () => {
      const response = await request(app).post('/trpc/v1.video.upload').set('Cookie', token).send({
        uploadUrl: 'https://my-bucket.s3.amazonaws.com/videos/123-video.mp4?...signature...',
        key: "videos/123-video"
      });

      expect(response.statusCode).toBe(200)
    })
})
