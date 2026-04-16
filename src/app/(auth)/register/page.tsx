"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Divider } from "@/components/ui/divider";

import type { RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "student",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError(null);
  }

  function handleRoleSelect(role: "student" | "teacher"): void {
    setFormData((prev) => ({ ...prev, role }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string | undefined> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          role: result.data.role,
        },
      },
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    console.info("[auth] user registered", {
      email: result.data.email,
      role: result.data.role,
    });
    setEmailSent(true);
    setLoading(false);
  }

  async function handleGoogleSignUp(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setSubmitError(error.message);
    }
  }

  if (emailSent) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-4 font-heading text-2xl font-bold text-text-primary">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            We sent a confirmation link to{" "}
            <span className="font-medium text-text-primary">{formData.email}</span>.
            Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 text-sm font-medium text-accent hover:underline"
          >
            Back to login
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create an account
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Start your PhilNITS journey with Hiraya.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            I am a...
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect("student")}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                formData.role === "student"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-glass text-text-secondary hover:border-accent/30"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("teacher")}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                formData.role === "teacher"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-glass text-text-secondary hover:border-accent/30"
              }`}
            >
              Teacher
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            name="firstName"
            placeholder="Juan"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            name="lastName"
            placeholder="Dela Cruz"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="new-password"
        />

        {submitError && (
          <p className="text-sm text-danger">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating account..." : "Sign up"}
        </Button>

        <Divider />

        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-glass bg-white px-5 py-2.5 text-sm font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <GoogleIcon />
          Sign up with Google
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
