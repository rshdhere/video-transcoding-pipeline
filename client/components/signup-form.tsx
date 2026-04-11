"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { authClient } from "@/lib/auth-client"
import { MailIcon } from "lucide-react"

type SignupFormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

type SignupFormProps = React.ComponentProps<"div"> & {
  emailSent: boolean
  setEmailSent: (val: boolean) => void
}

export function SignupForm({
  className,
  emailSent,
  setEmailSent,
  ...props
}: SignupFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupFormValues>()

  const onSubmit = async (data: SignupFormValues) => {
    const { error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError("root", { message: error.message })
      return
    }

    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Alert>
          <MailIcon />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            We&apos;ve sent a verification link to your email address. Please
            verify your account to continue.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...register("name", {
                    required: "name is required",
                    minLength: {
                      value: 4,
                      message: "name must be at least 4 characters",
                    },
                  })}
                />
                {errors.name && (
                  <FieldDescription className="text-destructive">
                    {errors.name.message}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="me@example.com"
                  {...register("email", {
                    required: "email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "enter a valid email",
                    },
                  })}
                />
                {errors.email && (
                  <FieldDescription className="text-destructive">
                    {errors.email.message}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      {...register("password", {
                        required: "password is required",
                        minLength: {
                          value: 8,
                          message: "minimum 8 characters required",
                        },
                      })}
                    />
                    {errors.password && (
                      <FieldDescription className="text-destructive">
                        {errors.password.message}
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      {...register("confirmPassword", {
                        required: "please confirm your password",
                        validate: (val) =>
                          val === watch("password") || "passwords do not match",
                      })}
                    />
                    {errors.confirmPassword && (
                      <FieldDescription className="text-destructive">
                        {errors.confirmPassword.message}
                      </FieldDescription>
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>

              {errors.root && (
                <FieldDescription className="text-destructive text-center">
                  {errors.root.message}
                </FieldDescription>
              )}

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="hover:underline">
                    Login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
