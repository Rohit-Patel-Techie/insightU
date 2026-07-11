import { z } from "zod"

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(150, "Username is too long")
      .regex(
        /^[\w.@+-]+$/,
        "Only letters, digits, and @/./+/-/_ are allowed"
      ),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password2: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password2, {
    message: "Passwords don't match",
    path: ["password2"],
  })

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

export const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    new_password2: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.new_password2, {
    message: "Passwords don't match",
    path: ["new_password2"],
  })