# Forgot Password & Google Sign-In — Design Spec

## Overview

Add two auth features to Hiraya:
1. **Forgot password** — users request a password reset via email/username, receive a magic link, and set a new password
2. **Google sign-in** — users authenticate with Google OAuth on both login and register pages, with a one-time role selection for first-time users

## New Pages

### `/forgot-password`
- Single input: email or username
- If username entered, server action resolves to email via `profiles` table lookup
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` with redirect to `/reset-password`
- On submit, shows "Check your email!" confirmation (same pattern as registration)
- "Remember your password? Back to login" link at bottom
- Generic success message regardless of whether email exists (prevents user enumeration)

### `/reset-password`
- Landed on via Supabase magic link (token in URL hash)
- Two fields: new password + confirm password
- Validation: 8-72 characters, passwords must match
- Calls `supabase.auth.updateUser({ password })` — Supabase session is established from the magic link token
- On success: redirect to `/dashboard`
- On error (expired/invalid link): show error with link back to `/forgot-password`

### `/select-role`
- Protected route: must be authenticated, but role can be null
- Shown once for first-time Google OAuth users
- Two cards with icons and descriptions:
  - **Student** — "Practice questions, track my progress, and prepare for the exam"
  - **Teacher** — "Create classes, assign practice sets, and monitor student progress"
- On selection: server action updates `profiles.role` and sets `app_metadata.role` via admin client
- Redirects to `/dashboard`

### `/auth/callback` (route handler)
- Exchanges OAuth authorization code for a session using `supabase.auth.exchangeCodeForSession(code)`
- Redirects to `/dashboard` (middleware handles role check and redirect to `/select-role` if needed)
- On error: redirects to `/login` with error message

## Modified Pages

### `/login`
- Add "Forgot password?" link below the password field (right-aligned)
- Add "or" divider between the submit button and a new "Sign in with Google" button
- Google button: white background, Google logo SVG, calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`

### `/register`
- Add "or" divider between the submit button and a new "Sign up with Google" button
- Same Google button styling as login page
- Same OAuth call, same callback flow

## Middleware Changes

Update `src/lib/supabase/middleware.ts`:
- After confirming a session exists, check `app_metadata.role`
- If role is null/undefined and path is not `/select-role` or `/auth/callback`: redirect to `/select-role`
- Add `/select-role` and `/auth/callback` to allowed paths for authenticated users without a role

## Database Changes

### Migration: make `profiles.role` nullable
- `ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL;`
- Update `handle_new_user()` trigger to set role as `NULL` when `raw_user_meta_data->>'role'` is absent (OAuth users don't have it)

## Validation Schemas

Add to `src/lib/validations/auth.ts`:
- `forgotPasswordSchema` — single `identifier` field (email or username, 1-255 chars)
- `resetPasswordSchema` — `password` (8-72 chars) + `confirmPassword` (must match)

## Server Actions

### `resolveIdentifierToEmail(identifier: string): Promise<string | null>`
- Already exists or similar pattern in login — reuse
- If identifier looks like email (contains @), return as-is
- Otherwise, query `profiles` table for matching username, return associated email

### `assignRole(role: 'student' | 'teacher'): Promise<void>`
- New server action in `/select-role/actions.ts`
- Gets current user from session
- Updates `profiles.role` via regular client
- Updates `auth.users.app_metadata.role` via admin client (`supabase.auth.admin.updateUserById()`)

## Supabase Configuration (Manual)

These must be configured in the Supabase dashboard:
- Enable Google provider under Authentication > Providers
- Set Google OAuth client ID and secret (from Google Cloud Console)
- Add `{SITE_URL}/auth/callback` to redirect URLs

## UI Components

### Google sign-in button
- White background, 1px warm border, 12px border radius
- Google "G" logo SVG (4-color official logo)
- Text: "Sign in with Google" or "Sign up with Google" depending on page
- Hover: slight lift + shadow deepen (consistent with existing button hover)

### "or" divider
- Horizontal line with "or" text centered
- Uses `rgba(139,94,60,0.15)` for lines, `#9C876E` muted text
- Placed between the primary action button and the Google button

## Error Handling

- **Forgot password**: always show success ("If an account exists, we sent a reset link") — no user enumeration
- **Reset password**: handle expired tokens gracefully with "Link expired" message and retry link
- **Google OAuth**: handle callback errors (user denied, provider error) with redirect to login + error message
- **Role selection**: if user somehow lands here with a role already set, redirect to `/dashboard`

## Security Considerations

- Forgot password uses generic messages to prevent email/username enumeration
- Reset password tokens are single-use and time-limited (Supabase default: 24 hours)
- OAuth state parameter handled by Supabase SDK (CSRF protection)
- Role selection is protected — requires authenticated session
- Admin client used only server-side for `app_metadata` updates
