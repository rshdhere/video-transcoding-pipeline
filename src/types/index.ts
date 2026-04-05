import { z } from "zod";

export const authSchema = {
  input: z
    .object({
      name: z.string(),
      email: z.email({ message: "invalid email for sign-up procedure" }),
      password: z
        .string()
        .min(8, { message: "password should be minimum of 8 charachters" })
        .max(24, { message: "password should be maximum of 24 charachters" })
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
          {
            message:
              "password must contain at least one upper-case letter, one lower-case letter, a number, and a special-character",
          },
        ),
    })
    .strict(),

  resendVerificationInput: z
    .object({
      email: z.email({ message: "invalid email for verification" }),
    })
    .strict(),

  signupOutput: z
    .object({
      name: z.string(),
    })
    .strict(),

  output: z
    .object({
      accessToken: z.jwt(),
      message: z.string(),
    })
    .strict(),

};
