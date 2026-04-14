import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["student", "teacher"], {
    error: "Please select a role",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
