import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  image: z.url().optional(),
  callbackURL: z.url().optional(),
});

export const signInSchema = z.object({
  email: z.email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
  callbackURL: z.url().optional(),
  rememberMe: z.boolean().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
