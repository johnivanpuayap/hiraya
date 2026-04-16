"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";

import type { LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string | undefined> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    let email = result.data.email;

    // If input doesn't look like an email, resolve username to email
    if (!email.includes("@")) {
      const { data: resolvedEmail, error: lookupError } = await supabase
        .rpc("get_email_by_username", { lookup_username: email });

      if (lookupError || !resolvedEmail) {
        setSubmitError("Invalid username or password");
        setLoading(false);
        return;
      }

      email = resolvedEmail;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: result.data.password,
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    console.info("[auth] user logged in", { email: result.data.email });
    router.replace("/dashboard");
  }

  async function handleGoogleSignIn(): Promise<void> {
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

  return (
    <Card>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Log in
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Welcome back! Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Email / Username"
          name="email"
          type="text"
          placeholder="Enter your email or username"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {submitError && (
          <p className="text-sm text-danger">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Logging in..." : "Log in"}
        </Button>

        <Divider />

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-glass bg-white px-5 py-2.5 text-sm font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
