# Forgot Password & Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forgot/reset password flow and Google OAuth sign-in to the Hiraya auth system.

**Architecture:** Three new pages (`/forgot-password`, `/reset-password`, `/select-role`), one new route handler (`/auth/callback`), middleware updates for role-less OAuth users, and a database migration to make `profiles.role` nullable. Google button added to existing login/register pages.

**Tech Stack:** Next.js App Router, Supabase Auth (OAuth + password reset), Zod validation, Tailwind CSS

---

### Task 1: Database Migration — Make `profiles.role` Nullable

**Files:**
- Create: `supabase/migrations/00002_nullable_role_for_oauth.sql`

This migration makes the role column nullable so Google OAuth users can exist without a role until they select one on `/select-role`.

- [ ] **Step 1: Create the migration file**

```sql
-- Allow NULL role for OAuth users who haven't selected a role yet
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IS NULL OR role IN ('student', 'teacher'));

-- Update trigger to set role as NULL when not provided (OAuth signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  user_role := NEW.raw_user_meta_data->>'role';

  -- Only set role if it's a valid value, otherwise leave NULL (OAuth users)
  IF user_role IS NOT NULL AND user_role NOT IN ('student', 'teacher') THEN
    user_role := NULL;
  END IF;

  INSERT INTO public.profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

- [ ] **Step 2: Apply the migration to your Supabase project**

Run this SQL in the Supabase dashboard SQL Editor, or via the Supabase CLI:
```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00002_nullable_role_for_oauth.sql
git commit -m "add migration to make profiles.role nullable for OAuth users"
```

---

### Task 2: Add Validation Schemas

**Files:**
- Modify: `src/lib/validations/auth.ts`

- [ ] **Step 1: Add forgot password and reset password schemas**

Add to the end of `src/lib/validations/auth.ts`:

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/auth.ts
git commit -m "add forgot password and reset password validation schemas"
```

---

### Task 3: Create `/forgot-password` Page

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Create the forgot password page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ForgotPasswordInput } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState<ForgotPasswordInput>({ email: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setFormData({ email: e.target.value });
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const result = forgotPasswordSchema.safeParse(formData);
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
    const siteUrl = window.location.origin;

    await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    // Always show success to prevent user enumeration
    console.info("[auth] password reset requested", { email: result.data.email });
    setEmailSent(true);
    setLoading(false);
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
            If an account exists for{" "}
            <span className="font-medium text-text-primary">{formData.email}</span>,
            we sent a password reset link.
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
        Forgot password?
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        No worries! Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to login
        </Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "add forgot password page"
```

---

### Task 4: Create `/reset-password` Page

**Files:**
- Create: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Create the reset password page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ResetPasswordInput } from "@/lib/validations/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: "",
    confirmPassword: "",
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

    const result = resetPasswordSchema.safeParse(formData);
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
    const { error } = await supabase.auth.updateUser({
      password: result.data.password,
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    console.info("[auth] password reset successful");
    router.replace("/dashboard");
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Set new password
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="New password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        {submitError && (
          <p className="text-sm text-danger">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Link expired?{" "}
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">
          Request a new one
        </Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "add reset password page"
```

---

### Task 5: Create `/auth/callback` Route Handler

**Files:**
- Create: `src/app/auth/callback/route.ts`

This route handler exchanges the OAuth or magic link code for a session, then redirects.

- [ ] **Step 1: Create the callback route handler**

```typescript
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    console.error("[auth] callback missing code parameter");
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] callback code exchange failed", { error: error.message });
    return NextResponse.redirect(`${origin}/login`);
  }

  console.info("[auth] callback code exchanged successfully");
  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "add auth callback route handler for OAuth and magic links"
```

---

### Task 6: Add "Forgot password?" Link to Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add the forgot password link below the password field**

In `src/app/(auth)/login/page.tsx`, add a "Forgot password?" link between the password `Input` and the `submitError` display. Find this section:

```tsx
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

        {submitError && (
```

Replace with:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "add forgot password link to login page"
```

---

### Task 7: Create Google Icon Component

**Files:**
- Create: `src/components/ui/google-icon.tsx`

A reusable SVG component for the Google "G" logo used on both login and register pages.

- [ ] **Step 1: Create the component**

```tsx
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/google-icon.tsx
git commit -m "add Google icon component"
```

---

### Task 8: Create OAuth Divider Component

**Files:**
- Create: `src/components/ui/divider.tsx`

- [ ] **Step 1: Create the divider component**

```tsx
export function Divider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-text-muted">
        {text}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/divider.tsx
git commit -m "add divider component"
```

---

### Task 9: Add Google Sign-In to Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add imports**

Add these imports to the top of `src/app/(auth)/login/page.tsx`:

```tsx
import { GoogleIcon } from "@/components/ui/google-icon";
import { Divider } from "@/components/ui/divider";
```

- [ ] **Step 2: Add Google sign-in handler**

Add this function inside the `LoginPage` component, after the `handleSubmit` function:

```tsx
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
```

- [ ] **Step 3: Add divider and Google button after the submit button**

Find this section at the end of the form:

```tsx
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
```

Replace with:

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "add Google sign-in button to login page"
```

---

### Task 10: Add Google Sign-Up to Register Page

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Add imports**

Add these imports to the top of `src/app/(auth)/register/page.tsx`:

```tsx
import { GoogleIcon } from "@/components/ui/google-icon";
import { Divider } from "@/components/ui/divider";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
```

Note: the register page doesn't currently import the browser client (it does `createClient()` inside `handleSubmit` referencing the already imported `createClient`). Check the existing import — if it already imports `createClient` from `@/lib/supabase/client`, just add `GoogleIcon` and `Divider`. If so, skip the `createBrowserClient` alias.

Looking at the existing code, it already imports `createClient` from `@/lib/supabase/client`, so just add:

```tsx
import { GoogleIcon } from "@/components/ui/google-icon";
import { Divider } from "@/components/ui/divider";
```

- [ ] **Step 2: Add Google sign-up handler**

Add this function inside the `RegisterPage` component, after the `handleSubmit` function:

```tsx
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
```

- [ ] **Step 3: Add divider and Google button after the submit button**

Find this section:

```tsx
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>
```

Replace with:

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/register/page.tsx
git commit -m "add Google sign-up button to register page"
```

---

### Task 11: Create Role Selection Server Action

**Files:**
- Create: `src/app/(auth)/select-role/actions.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assignRole(role: "student" | "teacher"): Promise<never> {
  if (role !== "student" && role !== "teacher") {
    throw new Error("Invalid role");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Update the profile role
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (profileError) {
    console.error("[auth] failed to update profile role", { error: profileError.message });
    throw new Error("Failed to assign role");
  }

  // Update app_metadata so the JWT hook picks up the role immediately
  const admin = createAdminClient();
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });

  if (metaError) {
    console.error("[auth] failed to update app_metadata role", { error: metaError.message });
    throw new Error("Failed to assign role");
  }

  console.info("[auth] role assigned", { userId: user.id, role });
  redirect("/dashboard");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/select-role/actions.ts
git commit -m "add server action to assign role for OAuth users"
```

---

### Task 12: Create `/select-role` Page

**Files:**
- Create: `src/app/(auth)/select-role/page.tsx`

- [ ] **Step 1: Create the role selection page**

```tsx
"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { assignRole } from "./actions";

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(role: "student" | "teacher"): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await assignRole(role);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Welcome to Hiraya!
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          One last step — tell us how you&apos;ll use Hiraya.
        </p>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      )}

      <div className="mt-7 flex flex-col gap-3.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSelect("student")}
          className="flex items-center gap-3.5 rounded-2xl border-2 border-glass p-5 text-left transition-all duration-200 hover:border-accent/30 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C77B1A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-text-primary">
              I&apos;m a Student
            </div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Practice questions, track my progress, and prepare for the exam
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSelect("teacher")}
          className="flex items-center gap-3.5 rounded-2xl border-2 border-glass p-5 text-left transition-all duration-200 hover:border-secondary/30 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B85A3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-text-primary">
              I&apos;m a Teacher
            </div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Create classes, assign practice sets, and monitor student progress
            </div>
          </div>
        </button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/select-role/page.tsx
git commit -m "add role selection page for first-time OAuth users"
```

---

### Task 13: Update Middleware for Role Check and New Routes

**Files:**
- Modify: `src/lib/supabase/middleware.ts`

The middleware needs to:
1. Allow unauthenticated access to `/forgot-password`, `/reset-password`, and `/auth/callback`
2. Redirect authenticated users without a role to `/select-role`
3. Allow authenticated users without a role to access `/select-role`

- [ ] **Step 1: Update the middleware**

Replace the entire contents of `src/lib/supabase/middleware.ts` with:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  // Uses raw process.env instead of @/lib/env — middleware runs in Edge runtime
  // where eager Zod validation adds cold-start latency. Caller (root middleware.ts)
  // handles route filtering via config.matcher.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback");

  // Not logged in and not on a public page → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isAuthRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  // Logged in and on auth page (login/register) → redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Logged in but no role (OAuth user who hasn't selected) → redirect to /select-role
  if (user && !isPublicRoute) {
    const role = user.app_metadata?.role;
    const isSelectRolePage = pathname.startsWith("/select-role");

    if (!role && !isSelectRolePage) {
      const url = request.nextUrl.clone();
      url.pathname = "/select-role";
      return NextResponse.redirect(url);
    }

    // Has role but trying to access /select-role → redirect to dashboard
    if (role && isSelectRolePage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "update middleware for forgot password, OAuth callback, and role check"
```

---

### Task 14: Manual Verification

- [ ] **Step 1: Start dev server and verify all pages render**

```bash
npm run dev
```

Visit each route and confirm they render without errors:
- `http://localhost:3000/login` — should show forgot password link + Google button
- `http://localhost:3000/register` — should show Google button
- `http://localhost:3000/forgot-password` — should show email input form
- `http://localhost:3000/reset-password` — should show password + confirm fields

- [ ] **Step 2: Verify forgot password flow**

1. Go to `/login`, click "Forgot password?" → should navigate to `/forgot-password`
2. Submit with invalid email → should show validation error
3. Submit with valid email → should show "Check your email" confirmation
4. Click "Back to login" → should navigate to `/login`

- [ ] **Step 3: Verify Google OAuth button**

1. On `/login`, click "Sign in with Google" → should redirect to Google OAuth (will fail unless Supabase Google provider is configured — that's expected)
2. On `/register`, click "Sign up with Google" → same redirect behavior

- [ ] **Step 4: Verify middleware redirects**

1. While logged out, visit `/select-role` → should redirect to `/login`
2. While logged out, visit `/forgot-password` → should render (no redirect)
3. While logged out, visit `/reset-password` → should render (no redirect)

- [ ] **Step 5: Push to remote**

```bash
git push origin feature/phase1-foundation
```
